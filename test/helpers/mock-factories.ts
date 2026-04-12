import { User } from '../../src/domain/entities';
import { UserRole } from '../../src/domain/enums';
import {
  IHashService,
  ITokenService,
  IUserRepository,
  TokenPair,
} from '../../src/domain/interfaces';

export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date();
  return new User({
    id: 'user-uuid-123',
    name: 'Rafael Neves',
    email: 'rafael@email.com',
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
    findAll: jest.fn(),
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
    verifyAccessToken: jest
      .fn()
      .mockReturnValue({ sub: 'user-uuid-123', email: 'rafael@email.com', role: 'Admin' }),
    verifyRefreshToken: jest
      .fn()
      .mockReturnValue({ sub: 'user-uuid-123', email: 'rafael@email.com', role: 'Admin' }),
  };
}
