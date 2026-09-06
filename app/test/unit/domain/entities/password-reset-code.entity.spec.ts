import { randomUUID } from 'node:crypto';
import { PasswordResetCode } from '@domain/entities/password-reset-code.entity';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('PasswordResetCode Entity', () => {
  it('should issue a code with zero attempts and a 10-minute expiry', () => {
    const userId = randomUUID();
    const before = Date.now();

    const code = PasswordResetCode.create(userId, 'hashed-code');

    expect(code.userId).toBe(userId);
    expect(code.codeHash).toBe('hashed-code');
    expect(code.attempts).toBe(0);
    expect(code.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 10 * 60_000 - 1000);
    expect(code.expiresAt.getTime()).toBeLessThanOrEqual(before + 10 * 60_000 + 1000);
  });

  it('should throw when codeHash is empty', () => {
    expect(() => PasswordResetCode.create(randomUUID(), '')).toThrow(DomainValidationException);
  });

  it('should report not expired right after issuance', () => {
    const code = PasswordResetCode.create(randomUUID(), 'hashed-code');

    expect(code.isExpired()).toBe(false);
  });

  it('should report expired once expiresAt is in the past', () => {
    const code = PasswordResetCode.reconstitute({
      userId: randomUUID(),
      codeHash: 'hashed-code',
      attempts: 0,
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(Date.now() - 11 * 60_000),
    });

    expect(code.isExpired()).toBe(true);
  });

  it('should report not exhausted below the attempt limit', () => {
    const code = PasswordResetCode.reconstitute({
      userId: randomUUID(),
      codeHash: 'hashed-code',
      attempts: 4,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    });

    expect(code.isExhausted()).toBe(false);
  });

  it('should report exhausted after 5 failed attempts', () => {
    const code = PasswordResetCode.reconstitute({
      userId: randomUUID(),
      codeHash: 'hashed-code',
      attempts: 5,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    });

    expect(code.isExhausted()).toBe(true);
  });
});
