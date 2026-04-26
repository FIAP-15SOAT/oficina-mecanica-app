import { CustomerType } from '@domain/enums/customer-type.enum';

export interface AddressDto {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface UpdateCustomerDto {
  name: string;
  document: string;
  type: CustomerType;
  email: string;
  phone: string;
  address: AddressDto;
}
