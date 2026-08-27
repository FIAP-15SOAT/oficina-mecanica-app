import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PersonType } from '../enums/person-type.enum';
import { DocumentValidator } from '../validators/document.validator';

export class Document {
  private constructor(
    public readonly value: string,
    public readonly type: PersonType,
  ) {}

  static create(value: string, type: PersonType): Document {
    Document.validatePresence(value);

    const sanitized = Document.sanitize(value);

    Document.validateMatchesType(sanitized, type);

    return new Document(sanitized, type);
  }

  static sanitize(value: string): string {
    return value
      .replaceAll(/[.\-/]/g, '')
      .trim()
      .toUpperCase();
  }

  private static validatePresence(value: string | null | undefined): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Documento é obrigatório');
    }
  }

  private static validateMatchesType(value: string, type: PersonType): void {
    if (type === PersonType.INDIVIDUAL && !DocumentValidator.validateCpf(value)) {
      throw new DomainValidationException('Pessoa física deve informar um CPF válido');
    }

    if (type === PersonType.COMPANY && !DocumentValidator.validateCnpj(value)) {
      throw new DomainValidationException('Pessoa jurídica deve informar um CNPJ válido');
    }
  }

  equals(other: Document): boolean {
    return other instanceof Document && this.value === other.value && this.type === other.type;
  }

  toString(): string {
    return this.value;
  }
}
