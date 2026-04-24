import { Injectable } from '@nestjs/common';
import { Customer as PrismaCustomer, Prisma } from '@generated/client';
import { Customer } from '@domain/entities/customer.entity';
import {
  CustomerFilters,
  ICustomerRepository,
} from '@domain/interfaces/repositories/customer.repository.interface';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { CustomerMapper } from '@infrastructure/mappers/customer.mapper';

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(customer: Customer): Promise<Customer> {
    const record = await this.prisma.customer.create({
      data: CustomerMapper.toPrismaCreate(customer),
    });
    return CustomerMapper.toDomain(record);
  }

  async findById(id: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({ where: { id } });
    return record ? CustomerMapper.toDomain(record) : null;
  }

  async findByDocument(document: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({ where: { document } });
    return record ? CustomerMapper.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({ where: { email } });
    return record ? CustomerMapper.toDomain(record) : null;
  }

  async findAll(filters: CustomerFilters): Promise<{ items: Customer[]; total: number }> {
    const { page, limit, name, type, document } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (type !== undefined) where.type = type;
    if (document) where.document = document;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      },
    });
    return CustomerMapper.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customer.delete({ where: { id } });
  }

  async hasVehicles(id: string): Promise<boolean> {
    const count = await this.prisma.vehicle.count({ where: { customerId: id } });
    return count > 0;
  }

  async hasWorkOrders(id: string): Promise<boolean> {
    const count = await this.prisma.workOrder.count({ where: { customerId: id } });
    return count > 0;
  }
}
