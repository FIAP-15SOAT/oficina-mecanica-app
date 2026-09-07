import { CustomerType } from '@domain/enums/customer-type.enum';

export interface AddressRequest {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CreateCustomerRequest {
  name: string;
  document: string;
  type: CustomerType;
  email: string;
  phone: string;
  address: AddressRequest;
  createAccess?: boolean;
}
