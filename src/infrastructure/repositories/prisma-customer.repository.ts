import { Injectable } from '@nestjs/common';
import { Customer as PrismaCustomer, Prisma } from '@generated/client';
import { Customer } from '@domain/entities/customer.entity';
import {
  CustomerFilters,
  ICustomerRepository,
} from '@domain/interfaces/repositories/customer.repository.interface';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { CustomerMapper } from '@infrastructure/mappers/customer.mapper';
import { PaginatedRepositoryResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { paginate } from '@infrastructure/database/prisma/prisma-paginate.helper';

const ADDRESS_INCLUDE = { address: true } as const;

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(customer: Customer): Promise<Customer> {
    const record = await this.prisma.customer.create({
      data: {
        id: customer.id,
        name: customer.name,
        type: customer.type,
        document: customer.document,
        email: customer.email,
        phone: customer.phone,
        ...(customer.address && {
          address: {
            create: {
              id: customer.address.id,
              street: customer.address.street,
              city: customer.address.city,
              state: customer.address.state,
              zipCode: customer.address.zipCode,
            },
          },
        }),
      },
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

  async findAllPaginated(
    pagination: PaginationInput,
    filters: CustomerFilters,
  ): Promise<PaginatedRepositoryResult<Customer>> {
    const { name, type, document } = filters;

    const where: Prisma.CustomerWhereInput = {};

    if (name) where.name = { contains: name.trim(), mode: 'insensitive' };
    if (type) where.type = type;
    if (document) where.document = document.replace(/[.\-/]/g, '').trim();

    const result = await paginate(
      this.prisma.customer,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: ADDRESS_INCLUDE
      },
      pagination,
    );

    return {
      items: result.items.map((r: PrismaCustomer) => CustomerMapper.toDomain(r)),
      total: result.total,
    };
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
