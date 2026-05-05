import { DomainValidationException } from '../exceptions/domain-validation.exception';

const ZIP_CODE_REGEX = /^\d{8}$/;

export class ZipCode {
  private constructor(public readonly value: string) {}

  static create(value: string): ZipCode {
    ZipCode.validatePresence(value);

    const sanitized = ZipCode.sanitize(value);

    ZipCode.validateFormat(sanitized);

    return new ZipCode(sanitized);
  }

  private static sanitize(value: string): string {
    return value.replace(/\D/g, '').trim();
  }

  private static validatePresence(value: string | null | undefined): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('CEP é obrigatório');
    }
  }

  private static validateFormat(value: string): void {
    if (!ZIP_CODE_REGEX.test(value)) {
      throw new DomainValidationException('CEP inválido. Formato esperado: 00000000');
    }
  }

  equals(other: ZipCode): boolean {
    return other instanceof ZipCode && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
