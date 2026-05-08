import { Injectable } from '@nestjs/common';
import { Customer as PrismaCustomer, Prisma } from '@generated/client';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { Customer } from '@domain/entities/customer.entity';
import {
  CustomerFilters,
  ICustomerRepository,
} from '@domain/interfaces/repositories/customer.repository.interface';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { CustomerMapper } from '@infrastructure/mappers/customer.mapper';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';
import { paginate } from '@infrastructure/database/prisma/prisma-paginate.helper';
import { existsBy } from '@infrastructure/database/prisma/prisma-exists.helper';

const ADDRESS_INCLUDE = { address: true } as const;

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(customer: Customer): Promise<Customer> {
    try {
      const record = await this.prisma.customer.create({
        data: {
          id: customer.id,
          name: customer.name,
          type: customer.type,
          document: customer.document.value,
          email: customer.email.value,
          phone: customer.phone.value,
          ...(customer.address && {
            address: {
              create: {
                street: customer.address.street,
                city: customer.address.city,
                state: customer.address.state,
                zipCode: customer.address.zipCode.value,
              },
            },
          }),
        },
        include: ADDRESS_INCLUDE,
      });
      return CustomerMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException('E-mail ou documento já cadastrado');
      }
      throw error;
    }
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
    if (document) where.document = document.replaceAll(/[.\-/]/g, '').trim();

    const result = await paginate(
      this.prisma.customer,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: ADDRESS_INCLUDE,
      },
      pagination,
    );

    return {
      items: result.items.map((r: PrismaCustomer) => CustomerMapper.toDomain(r)),
      total: result.total,
    };
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    try {
      const record = await this.prisma.customer.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.document !== undefined && { document: data.document.value }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.email !== undefined && { email: data.email.value }),
          ...(data.phone !== undefined && { phone: data.phone.value }),
          ...(data.address !== undefined && {
            address: data.address
              ? {
                  upsert: {
                    create: {
                      street: data.address.street,
                      city: data.address.city,
                      state: data.address.state,
                      zipCode: data.address.zipCode.value,
                    },
                    update: {
                      street: data.address.street,
                      city: data.address.city,
                      state: data.address.state,
                      zipCode: data.address.zipCode.value,
                    },
                  },
                }
              : { delete: true },
          }),
        },
        include: ADDRESS_INCLUDE,
      });
      return CustomerMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException('E-mail ou documento já cadastrado para outro cliente');
      }

      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customer.delete({ where: { id } });
  }

  async isCustomerInUse(id: string): Promise<boolean> {
    const [hasVehicles, hasWorkOrders] = await Promise.all([
      existsBy(this.prisma.vehicle, { customerId: id }),
      existsBy(this.prisma.workOrder, { customerId: id }),
    ]);

    return hasVehicles || hasWorkOrders;
  }
}
