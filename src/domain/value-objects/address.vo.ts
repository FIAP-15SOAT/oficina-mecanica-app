import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { ZipCode } from './zip-code.vo';

const MAX_STREET_LENGTH = 255;
const MAX_CITY_LENGTH = 100;
const STATE_REGEX = /^[A-Za-z]{2}$/;

export interface AddressProps {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export class Address {
  private constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly state: string,
    public readonly zipCode: ZipCode,
  ) {}

  static create(props: AddressProps): Address {
    Address.validateStreet(props.street);
    Address.validateCity(props.city);
    Address.validateState(props.state);

    const zipCode = ZipCode.create(props.zipCode);

    return new Address(
      props.street.trim(),
      props.city.trim(),
      props.state.trim().toUpperCase(),
      zipCode,
    );
  }

  private static validateStreet(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Logradouro é obrigatório');
    }

    if (value.trim().length > MAX_STREET_LENGTH) {
      throw new DomainValidationException(
        `Logradouro deve ter no máximo ${MAX_STREET_LENGTH} caracteres`,
      );
    }
  }

  private static validateCity(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Cidade é obrigatória');
    }

    if (value.trim().length > MAX_CITY_LENGTH) {
      throw new DomainValidationException(
        `Cidade deve ter no máximo ${MAX_CITY_LENGTH} caracteres`,
      );
    }
  }

  private static validateState(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Estado é obrigatório');
    }

    if (!STATE_REGEX.test(value.trim())) {
      throw new DomainValidationException('Estado deve ter exatamente 2 letras (ex: SP)');
    }
  }

  equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.state === other.state &&
      this.zipCode.equals(other.zipCode)
    );
  }

  toString(): string {
    return `${this.street}, ${this.city} - ${this.state}, ${this.zipCode.toString()}`;
  }
}
