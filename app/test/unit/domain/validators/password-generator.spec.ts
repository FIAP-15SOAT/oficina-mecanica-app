import { generateSecurePassword } from '@domain/validators/password-generator';
import { PasswordValidator } from '@domain/validators/password.validator';

describe('generateSecurePassword', () => {
  it('always generates a password that passes PasswordValidator', () => {
    for (let i = 0; i < 50; i++) {
      const password = generateSecurePassword();
      expect(() => PasswordValidator.validateStrength(password)).not.toThrow();
    }
  });

  it('generates a password of the requested length', () => {
    expect(generateSecurePassword(16)).toHaveLength(16);
  });

  it('generates different passwords across calls', () => {
    const a = generateSecurePassword();
    const b = generateSecurePassword();
    expect(a).not.toBe(b);
  });
});
