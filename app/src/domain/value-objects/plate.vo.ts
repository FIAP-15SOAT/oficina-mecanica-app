import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PLATE_REGEX } from '../constants/regex/plate.regex';

export class Plate {
  private constructor(public readonly value: string) {}

  static create(value: string): Plate {
    Plate.validatePresence(value);

    const sanitized = Plate.sanitize(value);

    Plate.validateFormat(sanitized);

    return new Plate(sanitized);
  }

  private static sanitize(value: string): string {
    return value.trim().toUpperCase().replaceAll('-', '');
  }

  private static validatePresence(value: string | null | undefined): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Placa é obrigatória');
    }
  }

  private static validateFormat(value: string): void {
    if (!PLATE_REGEX.test(value)) {
      throw new DomainValidationException(
        'Placa inválida. Use o formato antigo (ABC-1234) ou Mercosul (ABC1D23)',
      );
    }
  }

  equals(other: Plate): boolean {
    return other instanceof Plate && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
