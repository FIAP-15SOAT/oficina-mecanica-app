import { User as PrismaUser } from '@generated/client';
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { Email } from '@domain/value-objects/email.vo';

export class UserMapper {
  static toDomain(record: PrismaUser): User {
    return new User({
      id: record.id,
      name: record.name,
      email: Email.create(record.email),
      passwordHash: record.passwordHash,
      role: record.role as UserRole,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
