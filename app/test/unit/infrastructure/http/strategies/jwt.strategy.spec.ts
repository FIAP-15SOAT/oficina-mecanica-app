import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from '@infrastructure/http/strategies/jwt.strategy';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { UserRole } from '@domain/enums/user-role.enum';
import { User } from '@domain/entities/user.entity';

import { TokenPayload } from '@application/ports/output/token.service.interface';
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
    };

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      sub: mockUser.id,
      authFlow: 'INTERNAL',
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
    });

    expect(result).toEqual({
      sub: user.id,
      authFlow: 'INTERNAL',
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
    };

    const result = await strategy.validate(payload);

    // Should return data from database, not from token
    expect(result.authFlow).toBe('INTERNAL');
    expect(result.email).toBe(mockUser.email.value);
    if (result.authFlow === 'INTERNAL') {
      expect(result.role).toBe(mockUser.role);
    }
    expect(result.sub).toBe(mockUser.id);
  });
});
