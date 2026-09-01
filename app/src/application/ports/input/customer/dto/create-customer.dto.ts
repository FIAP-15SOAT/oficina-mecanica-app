import { CustomerType } from '@domain/enums/customer-type.enum';
import { AddressDto } from './address.dto';

export interface CreateCustomerDto {
  name: string;
  document: string;
  type: CustomerType;
  email: string;
  phone: string;
  address: AddressDto;
  createAccess?: boolean;
}
