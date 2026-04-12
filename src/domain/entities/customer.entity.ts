import { CustomerType } from '../enums';

export class Customer {
  id!: string;
  name!: string;
  document!: string;
  type!: CustomerType;
  email!: string | null;
  phone!: string | null;
  address!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Customer>) {
    Object.assign(this, partial);
  }
}
