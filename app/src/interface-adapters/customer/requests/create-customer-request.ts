import { PersonType } from '@domain/enums/person-type.enum';

export interface AddressRequest {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CreateCustomerRequest {
  name: string;
  document: string;
  type: PersonType;
  email: string;
  phone: string;
  address: AddressRequest;
}
