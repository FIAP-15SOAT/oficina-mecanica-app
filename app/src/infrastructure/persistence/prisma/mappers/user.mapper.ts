import { User as PrismaUser } from '@generated/client';
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';
import { PersonType } from '@domain/enums/person-type.enum';

export class UserMapper {
  static toDomain(record: PrismaUser): User {
    return User.reconstitute({
      id: record.id,
      name: record.name,
      email: Email.create(record.email),
      document: Document.create(record.document, PersonType.INDIVIDUAL),
      passwordHash: record.passwordHash,
      role: record.role as UserRole,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
