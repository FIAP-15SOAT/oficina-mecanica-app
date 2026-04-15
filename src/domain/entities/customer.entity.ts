import { CustomerType } from '../enums';
import { Address } from './address.entity';

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
}
