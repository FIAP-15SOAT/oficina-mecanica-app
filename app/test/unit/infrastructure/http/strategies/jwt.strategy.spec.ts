import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from '@infrastructure/http/strategies/jwt.strategy';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { UserRole } from '@domain/enums/user-role.enum';
import { User } from '@domain/entities/user.entity';

import { TokenPayload } from '@application/ports/output/token.service.interface';
import { AuthFlow } from '@domain/enums/auth-flow.enum';
import { createMockUser, createMockUserRepository } from '../../../../helpers/user-mock.factory';
import { Email } from '@domain/value-objects/email.vo';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<IUserRepository>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
    } as unknown as jest.Mocked<ConfigService>;

    userRepository = createMockUserRepository();

    strategy = new JwtStrategy(configService, userRepository);
  });

  it('should validate and return token payload for active user', async () => {
    const mockUser = createMockUser({
      id: 'user-uuid-123',
      email: Email.create('john@example.com'),
      role: UserRole.ADMIN,
      isActive: true,
    });

    userRepository.findById.mockResolvedValue(mockUser);

    const payload: TokenPayload = {
      sub: mockUser.id,
      email: mockUser.email.value,
      role: mockUser.role,
      iat: Math.floor(Date.now() / 1000),
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      sub: mockUser.id,
      authFlow: AuthFlow.INTERNAL,
      email: mockUser.email.value,
      role: mockUser.role,
    });
    expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
  });

  it('should tag the returned principal with authFlow INTERNAL', async () => {
    const user = User.create({
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hash',
      role: UserRole.ADMIN,
    });
    userRepository.findById.mockResolvedValue(user);

    const result = await strategy.validate({
      sub: user.id,
      email: user.email.value,
      role: user.role!,
      iat: Math.ceil(Date.now() / 1000) + 1,
    });

    expect(result).toEqual({
      sub: user.id,
      authFlow: AuthFlow.INTERNAL,
      email: user.email.value,
      role: UserRole.ADMIN,
    });
  });

  it('should throw UnauthorizedException when user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    const payload: TokenPayload = {
      sub: 'non-existent-user',
      email: 'nonexistent@example.com',
      role: UserRole.MECHANIC,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toThrow('Usuário inválido ou desativado');
  });

  it('should throw UnauthorizedException when user is inactive', async () => {
    const mockUser = createMockUser({
      id: 'user-uuid-456',
      email: Email.create('jane@example.com'),
      role: UserRole.ATTENDANT,
      isActive: false,
    });

    userRepository.findById.mockResolvedValue(mockUser);

    const payload: TokenPayload = {
      sub: mockUser.id,
      email: mockUser.email.value,
      role: mockUser.role,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toThrow('Usuário inválido ou desativado');
  });

  it('should throw UnauthorizedException when the user has no internal role (external-only account)', async () => {
    const mockUser = createMockUser({
      id: 'user-uuid-external',
      email: Email.create('external@example.com'),
      role: null,
      isActive: true,
    });

    userRepository.findById.mockResolvedValue(mockUser);

    const payload: TokenPayload = {
      sub: mockUser.id,
      email: mockUser.email.value,
      role: null,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toThrow('Usuário inválido ou desativado');
  });

  it('should reject a token issued before the last password change', async () => {
    const passwordChangedAt = new Date();
    const mockUser = createMockUser({
      id: 'user-uuid-password-changed',
      email: Email.create('changed@example.com'),
      role: UserRole.ADMIN,
      isActive: true,
      passwordChangedAt,
    });

    userRepository.findById.mockResolvedValue(mockUser);

    const payload: TokenPayload = {
      sub: mockUser.id,
      email: mockUser.email.value,
      role: mockUser.role,
      iat: Math.floor((passwordChangedAt.getTime() - 60_000) / 1000),
    };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toThrow(
      'Sessão expirada. Autentique-se novamente.',
    );
  });

  it('should accept a token issued after the last password change', async () => {
    const passwordChangedAt = new Date();
    const mockUser = createMockUser({
      id: 'user-uuid-password-changed-ok',
      email: Email.create('changed-ok@example.com'),
      role: UserRole.ADMIN,
      isActive: true,
      passwordChangedAt,
    });

    userRepository.findById.mockResolvedValue(mockUser);

    const payload: TokenPayload = {
      sub: mockUser.id,
      email: mockUser.email.value,
      role: mockUser.role,
      iat: Math.ceil((passwordChangedAt.getTime() + 60_000) / 1000),
    };

    const result = await strategy.validate(payload);

    expect(result.sub).toBe(mockUser.id);
  });

  it('should reject a token with no iat claim', async () => {
    const mockUser = createMockUser({
      id: 'user-uuid-no-iat',
      email: Email.create('no-iat@example.com'),
      role: UserRole.ADMIN,
      isActive: true,
    });

    userRepository.findById.mockResolvedValue(mockUser);

    const payload: TokenPayload = {
      sub: mockUser.id,
      email: mockUser.email.value,
      role: mockUser.role,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('should return payload with user data from database', async () => {
    const mockUser = createMockUser({
      id: 'user-uuid-789',
      email: Email.create('bob@example.com'),
      role: UserRole.MECHANIC,
      isActive: true,
    });

    userRepository.findById.mockResolvedValue(mockUser);

    const payload: TokenPayload = {
      sub: mockUser.id,
      email: 'old@example.com', // Different email in token
      role: UserRole.ADMIN, // Different role in token
      iat: Math.floor(Date.now() / 1000),
    };

    const result = await strategy.validate(payload);

    // Should return data from database, not from token
    expect(result.authFlow).toBe(AuthFlow.INTERNAL);
    expect(result.email).toBe(mockUser.email.value);
    if (result.authFlow === AuthFlow.INTERNAL) {
      expect(result.role).toBe(mockUser.role);
    }
    expect(result.sub).toBe(mockUser.id);
  });
});
