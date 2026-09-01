import { randomUUID } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { CustomerJwtStrategy } from '@infrastructure/http/strategies/customer-jwt.strategy';
import { User } from '@domain/entities/user.entity';
import {
  CUSTOMER_JWT_TEST_PRIVATE_KEY,
  CUSTOMER_JWT_TEST_PUBLIC_KEY,
  CUSTOMER_JWT_TEST_ISSUER,
  CUSTOMER_JWT_TEST_AUDIENCE,
  signTestCustomerToken,
} from '../../../../helpers/customer-jwt.helper';

describe('CustomerJwtStrategy', () => {
  function buildConfigService(): { getOrThrow: jest.Mock } {
    return {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          CUSTOMER_JWT_PUBLIC_KEY: 'test-public-key',
          CUSTOMER_JWT_ISSUER: 'oficina-customer-auth',
          CUSTOMER_JWT_AUDIENCE: 'oficina-api',
        };
        return values[key];
      }),
    };
  }

  it('should return a CUSTOMER principal when the user is active and has an active linked customer', async () => {
    const user = User.create({
      name: 'Maria',
      email: 'maria@example.com',
      passwordHash: 'hash',
      role: null,
      cpf: '12345678909',
    });
    const userRepository = { findById: jest.fn().mockResolvedValue(user) };
    const userCustomerRepository = {
      findActiveCustomerIdsByUserId: jest.fn().mockResolvedValue([randomUUID()]),
    };

    const strategy = new CustomerJwtStrategy(
      buildConfigService() as never,
      userRepository as never,
      userCustomerRepository as never,
    );

    const result = await strategy.validate({
      sub: user.id,
      iss: 'oficina-customer-auth',
      aud: 'oficina-api',
      iat: 0,
      exp: 0,
    });

    expect(result).toEqual({ sub: user.id, authFlow: 'CUSTOMER', email: user.email.value });
  });

  it('should reject an inactive user', async () => {
    const user = User.create({
      name: 'Maria',
      email: 'maria@example.com',
      passwordHash: 'hash',
      role: null,
      cpf: '12345678909',
    });
    user.deactivate();
    const userRepository = { findById: jest.fn().mockResolvedValue(user) };
    const userCustomerRepository = { findActiveCustomerIdsByUserId: jest.fn() };

    const strategy = new CustomerJwtStrategy(
      buildConfigService() as never,
      userRepository as never,
      userCustomerRepository as never,
    );

    await expect(
      strategy.validate({
        sub: user.id,
        iss: 'oficina-customer-auth',
        aud: 'oficina-api',
        iat: 0,
        exp: 0,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject a user with no active linked customer', async () => {
    const user = User.create({
      name: 'Maria',
      email: 'maria@example.com',
      passwordHash: 'hash',
      role: null,
      cpf: '12345678909',
    });
    const userRepository = { findById: jest.fn().mockResolvedValue(user) };
    const userCustomerRepository = {
      findActiveCustomerIdsByUserId: jest.fn().mockResolvedValue([]),
    };

    const strategy = new CustomerJwtStrategy(
      buildConfigService() as never,
      userRepository as never,
      userCustomerRepository as never,
    );

    await expect(
      strategy.validate({
        sub: user.id,
        iss: 'oficina-customer-auth',
        aud: 'oficina-api',
        iat: 0,
        exp: 0,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

function authenticateWithToken(
  strategy: CustomerJwtStrategy,
  token: string,
): Promise<{ outcome: 'success' | 'fail' | 'error'; value: unknown }> {
  return new Promise((resolve) => {
    (strategy as unknown as { success: (user: unknown) => void }).success = (user) =>
      resolve({ outcome: 'success', value: user });
    (strategy as unknown as { fail: (info: unknown) => void }).fail = (info) =>
      resolve({ outcome: 'fail', value: info });
    (strategy as unknown as { error: (err: unknown) => void }).error = (err) =>
      resolve({ outcome: 'error', value: err });

    (strategy as unknown as { authenticate: (req: unknown) => void }).authenticate({
      headers: { authorization: `Bearer ${token}` },
    });
  });
}

function realConfigService(): { getOrThrow: jest.Mock } {
  return {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        CUSTOMER_JWT_PUBLIC_KEY: CUSTOMER_JWT_TEST_PUBLIC_KEY,
        CUSTOMER_JWT_ISSUER: CUSTOMER_JWT_TEST_ISSUER,
        CUSTOMER_JWT_AUDIENCE: CUSTOMER_JWT_TEST_AUDIENCE,
      };
      return values[key];
    }),
  };
}

describe('CustomerJwtStrategy — real verification pipeline (via strategy.authenticate)', () => {
  it('should accept a validly RS256-signed token with correct issuer and audience', async () => {
    const user = User.create({
      name: 'Maria',
      email: 'maria@example.com',
      passwordHash: 'hash',
      role: null,
      cpf: '12345678909',
    });
    const userRepository = { findById: jest.fn().mockResolvedValue(user) };
    const userCustomerRepository = {
      findActiveCustomerIdsByUserId: jest.fn().mockResolvedValue([randomUUID()]),
    };
    const strategy = new CustomerJwtStrategy(
      realConfigService() as never,
      userRepository as never,
      userCustomerRepository as never,
    );

    const token = signTestCustomerToken(user.id);
    const result = await authenticateWithToken(strategy, token);

    expect(result.outcome).toBe('success');
    expect(result.value).toEqual({ sub: user.id, authFlow: 'CUSTOMER', email: user.email.value });
  });

  it('should reject a token signed with HS256 using the public key bytes as the HMAC secret', async () => {
    const userRepository = { findById: jest.fn() };
    const userCustomerRepository = { findActiveCustomerIdsByUserId: jest.fn() };
    const strategy = new CustomerJwtStrategy(
      realConfigService() as never,
      userRepository as never,
      userCustomerRepository as never,
    );

    const forgedToken = sign({ sub: randomUUID() }, CUSTOMER_JWT_TEST_PUBLIC_KEY, {
      algorithm: 'HS256',
      issuer: CUSTOMER_JWT_TEST_ISSUER,
      audience: CUSTOMER_JWT_TEST_AUDIENCE,
      expiresIn: 3600,
    });

    const result = await authenticateWithToken(strategy, forgedToken);

    expect(result.outcome).toBe('fail');
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('should reject a token with the wrong issuer', async () => {
    const userRepository = { findById: jest.fn() };
    const userCustomerRepository = { findActiveCustomerIdsByUserId: jest.fn() };
    const strategy = new CustomerJwtStrategy(
      realConfigService() as never,
      userRepository as never,
      userCustomerRepository as never,
    );

    const token = sign({ sub: randomUUID() }, CUSTOMER_JWT_TEST_PRIVATE_KEY, {
      algorithm: 'RS256',
      issuer: 'wrong-issuer',
      audience: CUSTOMER_JWT_TEST_AUDIENCE,
      expiresIn: 3600,
    });

    const result = await authenticateWithToken(strategy, token);

    expect(result.outcome).toBe('fail');
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('should reject a token with the wrong audience', async () => {
    const userRepository = { findById: jest.fn() };
    const userCustomerRepository = { findActiveCustomerIdsByUserId: jest.fn() };
    const strategy = new CustomerJwtStrategy(
      realConfigService() as never,
      userRepository as never,
      userCustomerRepository as never,
    );

    const token = sign({ sub: randomUUID() }, CUSTOMER_JWT_TEST_PRIVATE_KEY, {
      algorithm: 'RS256',
      issuer: CUSTOMER_JWT_TEST_ISSUER,
      audience: 'wrong-audience',
      expiresIn: 3600,
    });

    const result = await authenticateWithToken(strategy, token);

    expect(result.outcome).toBe('fail');
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('should reject an expired token', async () => {
    const userRepository = { findById: jest.fn() };
    const userCustomerRepository = { findActiveCustomerIdsByUserId: jest.fn() };
    const strategy = new CustomerJwtStrategy(
      realConfigService() as never,
      userRepository as never,
      userCustomerRepository as never,
    );

    const expiredToken = signTestCustomerToken(randomUUID(), -10);

    const result = await authenticateWithToken(strategy, expiredToken);

    expect(result.outcome).toBe('fail');
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('should reject a token signed with RS384 using the same RSA key pair', async () => {
    const userRepository = { findById: jest.fn() };
    const userCustomerRepository = { findActiveCustomerIdsByUserId: jest.fn() };
    const strategy = new CustomerJwtStrategy(
      realConfigService() as never,
      userRepository as never,
      userCustomerRepository as never,
    );

    const token = sign({ sub: randomUUID() }, CUSTOMER_JWT_TEST_PRIVATE_KEY, {
      algorithm: 'RS384',
      issuer: CUSTOMER_JWT_TEST_ISSUER,
      audience: CUSTOMER_JWT_TEST_AUDIENCE,
      expiresIn: 3600,
    });

    const result = await authenticateWithToken(strategy, token);

    expect(result.outcome).toBe('fail');
    expect(userRepository.findById).not.toHaveBeenCalled();
  });
});
