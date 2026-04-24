import { CustomerType } from '@domain/enums/customer-type.enum';

export interface UpdateCustomerDto {
  name?: string;
  document?: string;
  type?: CustomerType;
  email?: string;
  phone?: string;
}
