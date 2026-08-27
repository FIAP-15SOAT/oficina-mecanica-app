import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ITokenService, TokenPair } from '@application/ports/output/token.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';
import { PersonType } from '@domain/enums/person-type.enum';

export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date();

  return User.reconstitute({
    id: 'user-uuid-123',
    name: 'Admin User',
    email: Email.create('admin@email.com'),
    document: Document.create('12345678909', PersonType.INDIVIDUAL),
    passwordHash: '$2b$12$hashedpassword',
    role: UserRole.ADMIN,
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

export function createMockHashService(): jest.Mocked<IHashService> {
  return {
    hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
    compare: jest.fn().mockResolvedValue(true),
  };
}

export function createMockTokenService(): jest.Mocked<ITokenService> {
  const pair: TokenPair = {
    accessToken: 'access-token-mock',
    refreshToken: 'refresh-token-mock',
  };

  return {
    signAccessToken: jest.fn().mockReturnValue('access-token-mock'),
    signRefreshToken: jest.fn().mockReturnValue('refresh-token-mock'),
    signTokenPair: jest.fn().mockReturnValue(pair),
    verifyRefreshToken: jest
      .fn()
      .mockReturnValue({ sub: 'user-uuid-123', email: 'admin@email.com', role: UserRole.ADMIN }),
    signWithSecret: jest.fn().mockReturnValue('signed-token'),
    verifyWithSecret: jest.fn().mockReturnValue({ any: 'payload' }),
  };
}

export { createMockLogger } from './logger-mock.factory';
