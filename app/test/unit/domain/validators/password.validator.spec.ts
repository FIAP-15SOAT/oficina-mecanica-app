import { PasswordValidator } from '@domain/validators/password.validator';

describe('PasswordValidator', () => {
  describe('validateStrength', () => {
    it('should accept a strong password', () => {
      expect(PasswordValidator.validateStrength('Senha@123')).toBe(true);
    });

    it('should reject a password shorter than 8 characters', () => {
      expect(PasswordValidator.validateStrength('Ab@1cd')).toBe(false);
    });

    it('should reject a password with no uppercase letter', () => {
      expect(PasswordValidator.validateStrength('senha@123')).toBe(false);
    });

    it('should reject a password with no lowercase letter', () => {
      expect(PasswordValidator.validateStrength('SENHA@123')).toBe(false);
    });

    it('should reject a password with no digit', () => {
      expect(PasswordValidator.validateStrength('Senha@abc')).toBe(false);
    });

    it('should reject a password with no special character', () => {
      expect(PasswordValidator.validateStrength('Senha1234')).toBe(false);
    });

    it('should reject an empty password', () => {
      expect(PasswordValidator.validateStrength('')).toBe(false);
    });
  });
});
