import { Injectable } from '@nestjs/common';
import { Prisma, User as PrismaUser } from '@generated/client';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { User } from '@domain/entities/user.entity';
import {
  IUserRepository,
  UserFilters,
} from '@domain/interfaces/repositories/user.repository.interface';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';
import { PrismaService } from '../database/prisma/prisma.service';
import { UserMapper } from '../mappers/user.mapper';
import { paginate } from '../database/prisma/prisma-paginate.helper';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: User): Promise<User> {
    try {
      const created = await this.prisma.user.create({
        data: {
          name: user.name,
          email: user.email.value,
          passwordHash: user.passwordHash,
          role: user.role,
          isActive: user.isActive,
        },
      });

      return UserMapper.toDomain(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException('E-mail já cadastrado');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });

    if (!record) return null;

    return UserMapper.toDomain(record);
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });

    if (!record) return null;

    return UserMapper.toDomain(record);
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters?: UserFilters,
  ): Promise<PaginatedRepositoryResult<User>> {
    const where: Prisma.UserWhereInput = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.name) {
      where.name = { contains: filters.name.trim(), mode: 'insensitive' };
    }

    const result = await paginate(
      this.prisma.user,
      {
        where,
        orderBy: { createdAt: 'desc' },
      },
      pagination,
    );

    return {
      items: result.items.map((record: PrismaUser) => UserMapper.toDomain(record)),
      total: result.total,
    };
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email.value }),
          ...(data.passwordHash !== undefined && { passwordHash: data.passwordHash }),
          ...(data.role !== undefined && { role: data.role }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      return UserMapper.toDomain(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException('E-mail já cadastrado para outro usuário');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
