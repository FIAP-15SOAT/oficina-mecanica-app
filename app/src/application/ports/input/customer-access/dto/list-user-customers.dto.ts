import { CustomerType } from '@domain/enums/customer-type.enum';

export interface LinkedCustomerOutputDto {
  id: string;
  name: string;
  type: CustomerType;
  isActive: boolean;
}
