import { CustomerType } from '@domain/enums/customer-type.enum';
import { AddressDto } from './create-customer.dto';

export interface UpdateCustomerDto {
  name?: string;
  document?: string;
  type?: CustomerType;
  email?: string;
  phone?: string;
  address?: AddressDto | null;
}
