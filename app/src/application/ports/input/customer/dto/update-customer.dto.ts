import { PersonType } from '@domain/enums/person-type.enum';
import { AddressDto } from './address.dto';

export interface UpdateCustomerDto {
  name: string;
  document: string;
  type: PersonType;
  email: string;
  phone: string;
  address: AddressDto;
}
