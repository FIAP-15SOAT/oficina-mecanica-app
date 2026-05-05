import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { CustomerType } from '../enums/customer-type.enum';
import { DocumentValidator } from '../validators/document.validator';

export class Document {
  private constructor(
    public readonly value: string,
    public readonly type: CustomerType,
  ) {}

  static create(value: string, type: CustomerType): Document {
    Document.validatePresence(value);

    const sanitized = Document.sanitize(value);

    Document.validateMatchesType(sanitized, type);

    return new Document(sanitized, type);
  }

  private static sanitize(value: string): string {
    return value
      .replace(/[.\-/]/g, '')
      .trim()
      .toUpperCase();
  }

  private static validatePresence(value: string | null | undefined): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Documento é obrigatório');
    }
  }

  private static validateMatchesType(value: string, type: CustomerType): void {
    if (type === CustomerType.INDIVIDUAL && !DocumentValidator.validateCpf(value)) {
      throw new DomainValidationException('Pessoa física deve informar um CPF válido');
    }

    if (type === CustomerType.COMPANY && !DocumentValidator.validateCnpj(value)) {
      throw new DomainValidationException('Pessoa jurídica deve informar um CNPJ válido');
    }
  }

  equals(other: Document): boolean {
    return other instanceof Document && this.value === other.value && this.type === other.type;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
