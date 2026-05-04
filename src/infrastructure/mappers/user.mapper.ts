import { User as PrismaUser } from '@generated/client';
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';

export class UserMapper {
  static toDomain(record: PrismaUser): User {
    return new User({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      role: record.role as UserRole,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
