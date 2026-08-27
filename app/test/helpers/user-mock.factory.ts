import { randomUUID } from 'node:crypto';
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';
import { PersonType } from '@domain/enums/person-type.enum';

export function createMockPrismaUser(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: randomUUID(),
    name: 'John Doe',
    email: 'john.doe@example.com',
    document: '12345678909',
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.ATTENDANT,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date();

  return User.reconstitute({
    id: randomUUID(),
    name: 'John Doe',
    email: Email.create('john.doe@example.com'),
    document: Document.create('12345678909', PersonType.INDIVIDUAL),
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.ATTENDANT,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function createMockUserRepository(): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByDocument: jest.fn(),
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}
