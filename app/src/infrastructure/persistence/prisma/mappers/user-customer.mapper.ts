import { UserCustomer as PrismaUserCustomer } from '@generated/client';
import { UserCustomer } from '@domain/entities/user-customer.entity';

export class UserCustomerMapper {
  static toDomain(record: PrismaUserCustomer): UserCustomer {
    return UserCustomer.reconstitute({
      userId: record.userId,
      customerId: record.customerId,
      createdAt: record.createdAt,
    });
  }
}
