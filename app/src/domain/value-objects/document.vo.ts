import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PersonType } from '../enums/person-type.enum';
import { DocumentValidator } from '../validators/document.validator';

export class Document {
  private constructor(
    public readonly value: string,
    public readonly type: PersonType,
  ) {}

  static create(value: string, type?: PersonType): Document {
    Document.validatePresence(value);

    const sanitized = Document.sanitize(value);
    const resolvedType = type ?? Document.detectType(sanitized);

    Document.validateMatchesType(sanitized, resolvedType);

    return new Document(sanitized, resolvedType);
  }

  static sanitize(value: string): string {
    return value
      .replaceAll(/[.\-/]/g, '')
      .trim()
      .toUpperCase();
  }

  private static detectType(sanitized: string): PersonType {
    if (sanitized.length === 11) return PersonType.INDIVIDUAL;
    if (sanitized.length === 14) return PersonType.COMPANY;

    throw new DomainValidationException('Documento inválido: informe um CPF ou CNPJ');
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
