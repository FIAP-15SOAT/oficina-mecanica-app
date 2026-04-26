import { Injectable } from '@nestjs/common';
import { Customer as PrismaCustomer, Prisma } from '@generated/client';
import { Customer } from '@domain/entities/customer.entity';
import {
  CustomerFilters,
  ICustomerRepository,
  PaginatedCustomersDto,
} from '@domain/interfaces/repositories/customer.repository.interface';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { CustomerMapper } from '@infrastructure/mappers/customer.mapper';

const ADDRESS_INCLUDE = { address: true } as const;

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(customer: Customer): Promise<Customer> {
    const record = await this.prisma.customer.create({
      data: CustomerMapper.toPrismaCreate(customer),
      include: ADDRESS_INCLUDE,
    });
    return CustomerMapper.toDomain(record);
  }

  async findById(id: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({
      where: { id },
      include: ADDRESS_INCLUDE,
    });
    return record ? CustomerMapper.toDomain(record) : null;
  }

  async findByDocument(document: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({
      where: { document },
      include: ADDRESS_INCLUDE,
    });
    return record ? CustomerMapper.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({
      where: { email },
      include: ADDRESS_INCLUDE,
    });
    return record ? CustomerMapper.toDomain(record) : null;
  }

  async findAllPaginated(filters: CustomerFilters): Promise<PaginatedCustomersDto> {
    const { page, limit, name, type, document } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (type) where.type = type;
    if (document) where.document = document;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ADDRESS_INCLUDE,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items: records.map((r: PrismaCustomer) => CustomerMapper.toDomain(r)), total };
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const record = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.document !== undefined && { document: data.document }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && {
          address: data.address
            ? {
                upsert: {
                  create: {
                    id: data.address.id,
                    street: data.address.street,
                    city: data.address.city,
                    state: data.address.state,
                    zipCode: data.address.zipCode,
                  },
                  update: {
                    street: data.address.street,
                    city: data.address.city,
                    state: data.address.state,
                    zipCode: data.address.zipCode,
                  },
                },
              }
            : { delete: true },
        }),
      },
      include: ADDRESS_INCLUDE,
    });
    return CustomerMapper.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customer.delete({ where: { id } });
  }

  async hasVehicles(id: string): Promise<boolean> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { customerId: id },
      select: { id: true },
    });
    return !!vehicle;
  }

  async hasWorkOrders(id: string): Promise<boolean> {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { customerId: id },
      select: { id: true },
    });
    return !!workOrder;
  }
}
