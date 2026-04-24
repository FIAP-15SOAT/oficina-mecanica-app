import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { CustomerType } from '../enums/customer-type.enum';
import { Address } from './address.entity';

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 150;
const MAX_PHONE_LENGTH = 20;

const CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateCustomerProps {
  name: string;
  document: string;
  type: CustomerType;
  email: string;
  phone: string;
}

export class Customer {
  id!: string;
  name!: string;
  document!: string;
  type!: CustomerType;
  email!: string;
  phone!: string;
  addresses!: Address[];
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Customer>) {
    Object.assign(this, partial);
  }

  static create(props: CreateCustomerProps): Customer {
    const customer = new Customer({
      id: crypto.randomUUID(),
      name: props.name.trim(),
      document: props.document.trim(),
      type: props.type,
      email: props.email.trim(),
      phone: props.phone.trim(),
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    customer.validateName();
    customer.validateDocument();
    customer.validateEmail();
    customer.validatePhone();

    return customer;
  }

  private validateName(): void {
    if (!this.name) {
      throw new DomainValidationException('Nome é obrigatório');
    }
    if (this.name.length < MIN_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`);
    }
    if (this.name.length > MAX_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`);
    }
  }

  private validateDocument(): void {
    if (!this.document) {
      throw new DomainValidationException('Documento é obrigatório');
    }
    if (!CPF_REGEX.test(this.document) && !CNPJ_REGEX.test(this.document)) {
      throw new DomainValidationException(
        'Documento inválido. Use o formato CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)',
      );
    }
  }

  private validateEmail(): void {
    if (!this.email) {
      throw new DomainValidationException('E-mail é obrigatório');
    }
    if (!EMAIL_REGEX.test(this.email)) {
      throw new DomainValidationException('E-mail inválido');
    }
  }

  private validatePhone(): void {
    if (!this.phone) {
      throw new DomainValidationException('Telefone é obrigatório');
    }
    if (this.phone.length > MAX_PHONE_LENGTH) {
      throw new DomainValidationException(
        `Telefone deve ter no máximo ${MAX_PHONE_LENGTH} caracteres`,
      );
    }
  }
}
