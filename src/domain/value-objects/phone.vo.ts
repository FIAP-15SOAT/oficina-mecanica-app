import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PHONE_REGEX } from '../constants/regex/phone.regex';

export class Phone {
  private constructor(public readonly value: string) {}

  static create(value: string): Phone {
    Phone.validatePresence(value);

    const sanitized = Phone.sanitize(value);

    Phone.validateFormat(sanitized);

    return new Phone(sanitized);
  }

  private static sanitize(value: string): string {
    return value.replace(/\D/g, '').trim();
  }

  private static validatePresence(value: string | null | undefined): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Telefone é obrigatório');
    }
  }

  private static validateFormat(value: string): void {
    if (!PHONE_REGEX.test(value)) {
      throw new DomainValidationException(
        'Telefone inválido. Use o formato (11) 99999-9999 ou 99999-9999',
      );
    }
  }

  equals(other: Phone): boolean {
    return other instanceof Phone && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
