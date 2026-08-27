import { randomUUID } from 'node:crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PersonType } from '../enums/person-type.enum';
import { Address, AddressProps } from '../value-objects/address.vo';
import { Email } from '../value-objects/email.vo';
import { Phone } from '../value-objects/phone.vo';
import { Document } from '../value-objects/document.vo';
import { MIN_NAME_LENGTH, MAX_NAME_LENGTH } from '../constants/validation/customer.constants';

export interface CreateCustomerProps {
  name: string;
  document: string;
  type: PersonType;
  email: string;
  phone: string;
  address: AddressProps;
}

export interface UpdateCustomerProps {
  name: string;
  document: string;
  type: PersonType;
  email: string;
  phone: string;
  address: AddressProps;
}

interface CustomerProps {
  id: string;
  name: string;
  document: Document;
  type: PersonType;
  email: Email;
  phone: Phone;
  address: Address | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Customer {
  readonly id: string;
  name: string;
  document: Document;
  type: PersonType;
  email: Email;
  phone: Phone;
  address: Address | null;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: CustomerProps) {
    this.id = props.id;
    this.name = props.name;
    this.document = props.document;
    this.type = props.type;
    this.email = props.email;
    this.phone = props.phone;
    this.address = props.address;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: CustomerProps): Customer {
    return new Customer(props);
  }

  static create(props: CreateCustomerProps): Customer {
    Customer.validateName(props.name);

    return new Customer({
      id: randomUUID(),
      name: props.name.trim(),
      document: Document.create(props.document, props.type),
      type: props.type,
      email: Email.create(props.email),
      phone: Phone.create(props.phone),
      address: Address.create(props.address),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  update(props: UpdateCustomerProps): void {
    Customer.validateName(props.name);

    this.name = props.name.trim();
    this.document = Document.create(props.document, props.type);
    this.type = props.type;
    this.email = Email.create(props.email);
    this.phone = Phone.create(props.phone);
    this.address = Address.create(props.address);
    this.updatedAt = new Date();
  }

  toJSON(): CustomerProps {
    return {
      id: this.id,
      name: this.name,
      document: this.document,
      type: this.type,
      email: this.email,
      phone: this.phone,
      address: this.address,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainValidationException('Nome é obrigatório');
    }

    const trimmed = name.trim();

    if (trimmed.length < MIN_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`);
    }

    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`);
    }
  }
}
