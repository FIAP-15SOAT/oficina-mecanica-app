import { PASSWORD_REGEX } from '../constants/regex/password.regex';

export class PasswordValidator {
  static validateStrength(password: string): boolean {
    return PASSWORD_REGEX.test(password);
  }
}
