import { CustomerType } from '@domain/enums/customer-type.enum';

export interface AuthenticateCustomerInputDto {
  identifier: string;
  password: string;
}

export interface AuthenticateCustomerOutputDto {
  accessToken: string;
  refreshToken: string;
  customer: {
    id: string;
    name: string;
    email: string;
    document: string;
    type: CustomerType;
  };
}
