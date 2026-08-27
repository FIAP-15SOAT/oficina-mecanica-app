import { UserCustomerAccess as PrismaUserCustomerAccess } from '@generated/client';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

export class UserCustomerAccessMapper {
  static toDomain(record: PrismaUserCustomerAccess): UserCustomerAccess {
    return UserCustomerAccess.reconstitute({
      id: record.id,
      userId: record.userId,
      customerId: record.customerId,
      relationship: record.relationship as AccessRelationship,
      createdAt: record.createdAt,
    });
  }
}
