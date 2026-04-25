import { CustomerType } from '@domain/enums/customer-type.enum';
import { AddressProps } from '@domain/entities/customer.entity';

export interface UpdateCustomerDto {
  name?: string;
  document?: string;
  type?: CustomerType;
  email?: string;
  phone?: string;
  address?: AddressProps | null;
}
