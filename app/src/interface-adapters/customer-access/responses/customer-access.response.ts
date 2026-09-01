import { UserPublicView } from '@domain/entities/user.entity';
import { LinkedCustomerOutputDto } from '@application/use-cases/customer-access/list-user-customers.use-case';

export interface CustomerAccessResponse {
  userId: string;
  customerId: string;
  initialPasswordSent: boolean;
}

export interface CustomerAccessDataResponse {
  data: CustomerAccessResponse;
}

export interface AccessUserListResponse {
  data: UserPublicView[];
}

export interface LinkedCustomerListResponse {
  data: LinkedCustomerOutputDto[];
}
