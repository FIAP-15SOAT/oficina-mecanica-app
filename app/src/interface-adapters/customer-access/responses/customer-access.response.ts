import { UserPublicView } from '@domain/entities/user.entity';
import { LinkedCustomerOutputDto } from '@application/ports/input/customer-access/dto/list-user-customers.dto';

export interface CustomerAccessResponse {
  user: UserPublicView;
  customer: LinkedCustomerOutputDto;
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
