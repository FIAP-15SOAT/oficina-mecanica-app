import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/client';
import { PrismaService } from '../prisma.service';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { IUserCustomerAccessRepository } from '@domain/interfaces/repositories/user-customer-access.repository.interface';
import { UserCustomerAccessMapper } from '../mappers/user-customer-access.mapper';

@Injectable()
export class PrismaUserCustomerAccessRepository implements IUserCustomerAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(access: UserCustomerAccess): Promise<UserCustomerAccess> {
    try {
      const record = await this.prisma.userCustomerAccess.create({
        data: {
          id: access.id,
          userId: access.userId,
          customerId: access.customerId,
          relationship: access.relationship,
        },
      });

      return UserCustomerAccessMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException('Este usuário já está vinculado a este cliente.');
      }
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<UserCustomerAccess[]> {
    const records = await this.prisma.userCustomerAccess.findMany({ where: { userId } });
    return records.map((record) => UserCustomerAccessMapper.toDomain(record));
  }

  async findByUserIdAndCustomerId(
    userId: string,
    customerId: string,
  ): Promise<UserCustomerAccess | null> {
    const record = await this.prisma.userCustomerAccess.findUnique({
      where: { userId_customerId: { userId, customerId } },
    });

    return record ? UserCustomerAccessMapper.toDomain(record) : null;
  }
}
