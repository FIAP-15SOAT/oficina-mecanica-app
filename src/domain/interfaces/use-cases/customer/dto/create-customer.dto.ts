import { CustomerType } from '@domain/enums/customer-type.enum';

export interface CreateCustomerDto {
  name: string;
  document: string;
  type: CustomerType;
  email: string;
  phone: string;
}
