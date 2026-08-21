import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PASSWORD_REGEX } from '../constants/regex/password.regex';
import { PASSWORD_REQUIREMENTS_MESSAGE } from '../constants/validation/password.constants';

export class PasswordValidator {
  static validateStrength(password: string): void {
    if (!PASSWORD_REGEX.test(password)) {
      throw new DomainValidationException(PASSWORD_REQUIREMENTS_MESSAGE);
    }
  }
}
