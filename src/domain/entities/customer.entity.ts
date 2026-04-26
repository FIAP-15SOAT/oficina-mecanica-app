import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { CustomerType } from '../enums/customer-type.enum';
import { Address } from './address.entity';
import { DocumentValidator } from '@infrastructure/validators/document.validator';

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 150;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// DDD opcional com parênteses, espaço opcional, celular (9[1-9]XXXXXXX) ou fixo ([2-8]XXXXXXX), hífen opcional
const PHONE_REGEX = /^(\(?[1-9]{2}\)?)?[\s-]?(?:[2-8]|9[1-9])[0-9]{3}-?[0-9]{4}$/;

export interface AddressProps {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CreateCustomerProps {
  name: string;
  document: string;
  type: CustomerType;
  email: string;
  phone: string;
  address: AddressProps;
}

export class Customer {
  id!: string;
  name!: string;
  document!: string;
  type!: CustomerType;
  email!: string;
  phone!: string;
  address?: Address | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Customer>) {
    Object.assign(this, partial);
  }

  static create(props: CreateCustomerProps): Customer {
    const id = crypto.randomUUID();
    const customer = new Customer({
      id,
      name: props.name.trim(),
      document: props.document.trim(),
      type: props.type,
      email: props.email.trim(),
      phone: props.phone.trim(),
      address: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    customer.validateName();
    customer.validateDocument();
    customer.validateEmail();
    customer.validatePhone();

    customer.address = Address.create({ customerId: id, ...props.address });

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
    if (this.type === CustomerType.INDIVIDUAL && !DocumentValidator.validateCpf(this.document)) {
      throw new DomainValidationException('Pessoa física deve informar um CPF válido');
    }
    if (this.type === CustomerType.COMPANY && !DocumentValidator.validateCnpj(this.document)) {
      throw new DomainValidationException('Pessoa jurídica deve informar um CNPJ válido');
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
    if (!PHONE_REGEX.test(this.phone)) {
      throw new DomainValidationException(
        'Telefone inválido. Use o formato (11) 99999-9999 ou 99999-9999',
      );
    }
  }
}
