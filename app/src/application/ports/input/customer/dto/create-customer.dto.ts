import { PersonType } from '@domain/enums/person-type.enum';
import { AddressDto } from './address.dto';

export interface CreateCustomerDto {
  name: string;
  document: string;
  type: PersonType;
  email: string;
  phone: string;
  address: AddressDto;
}
