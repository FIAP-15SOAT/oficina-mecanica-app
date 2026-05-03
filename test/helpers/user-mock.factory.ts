import { randomUUID } from 'node:crypto';
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date();

  return new User({
    id: randomUUID(),
    name: 'John Doe',
    email: 'john.doe@example.com',
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
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}
