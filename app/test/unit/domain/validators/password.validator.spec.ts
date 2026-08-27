import { PasswordValidator } from '@domain/validators/password.validator';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { PASSWORD_REQUIREMENTS_MESSAGE } from '@domain/constants/validation/password.constants';

describe('PasswordValidator', () => {
  describe('validateStrength', () => {
    it('should accept a strong password', () => {
      expect(() => PasswordValidator.validateStrength('Senha@123')).not.toThrow();
    });

    it('should throw if password is shorter than 8 characters', () => {
      expect(() => PasswordValidator.validateStrength('Ab@1cd')).toThrow(DomainValidationException);
      expect(() => PasswordValidator.validateStrength('Ab@1cd')).toThrow(
        PASSWORD_REQUIREMENTS_MESSAGE,
      );
    });

    it('should throw if password has no uppercase letter', () => {
      expect(() => PasswordValidator.validateStrength('senha@123')).toThrow(
        PASSWORD_REQUIREMENTS_MESSAGE,
      );
    });

    it('should throw if password has no lowercase letter', () => {
      expect(() => PasswordValidator.validateStrength('SENHA@123')).toThrow(
        PASSWORD_REQUIREMENTS_MESSAGE,
      );
    });

    it('should throw if password has no digit', () => {
      expect(() => PasswordValidator.validateStrength('Senha@abc')).toThrow(
        PASSWORD_REQUIREMENTS_MESSAGE,
      );
    });

    it('should throw if password has no special character', () => {
      expect(() => PasswordValidator.validateStrength('Senha1234')).toThrow(
        PASSWORD_REQUIREMENTS_MESSAGE,
      );
    });

    it('should throw if password is empty', () => {
      expect(() => PasswordValidator.validateStrength('')).toThrow(DomainValidationException);
    });
  });
});
