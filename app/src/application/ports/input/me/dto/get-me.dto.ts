import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';

export interface GetMeCustomerDto {
  id: string;
  name: string;
  type: CustomerType;
}

export interface GetMeOutputDto {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  customers: GetMeCustomerDto[];
}
