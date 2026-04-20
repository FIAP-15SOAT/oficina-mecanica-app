import { DomainValidationException } from '../exceptions/domain-validation.exception';

const MAX_STREET_LENGTH = 255;
const MAX_CITY_LENGTH = 100;
const STATE_LENGTH = 2;
const ZIP_CODE_REGEX = /^\d{5}-\d{3}$/;

export class Address {
  id!: string;
  customerId!: string;
  street!: string;
  city!: string;
  state!: string;
  zipCode!: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Address>) {
    Object.assign(this, partial);
  }

  static create(props: {
    customerId: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
  }): Address {
    const address = new Address({
      customerId: props.customerId.trim(),
      street: props.street.trim(),
      city: props.city.trim(),
      state: props.state.trim().toUpperCase(),
      zipCode: props.zipCode.trim(),
    });

    address.validateCustomerId();
    address.validateStreet();
    address.validateCity();
    address.validateState();
    address.validateZipCode();

    return address;
  }

  private validateCustomerId(): void {
    if (!this.customerId || this.customerId.trim().length === 0) {
      throw new DomainValidationException('customerId é obrigatório');
    }
  }

  private validateStreet(): void {
    if (!this.street || this.street.length === 0) {
      throw new DomainValidationException('Logradouro é obrigatório');
    }
    if (this.street.length > MAX_STREET_LENGTH) {
      throw new DomainValidationException(
        `Logradouro deve ter no máximo ${MAX_STREET_LENGTH} caracteres`,
      );
    }
  }

  private validateCity(): void {
    if (!this.city || this.city.length === 0) {
      throw new DomainValidationException('Cidade é obrigatória');
    }
    if (this.city.length > MAX_CITY_LENGTH) {
      throw new DomainValidationException(
        `Cidade deve ter no máximo ${MAX_CITY_LENGTH} caracteres`,
      );
    }
  }

  private validateState(): void {
    if (!this.state || this.state.length !== STATE_LENGTH) {
      throw new DomainValidationException('Estado deve ter exatamente 2 caracteres (ex: SP)');
    }
  }

  private validateZipCode(): void {
    if (!this.zipCode || !ZIP_CODE_REGEX.test(this.zipCode)) {
      throw new DomainValidationException('CEP inválido. Formato esperado: 00000-000');
    }
  }
}
