import { CustomerType } from '@domain/enums/customer-type.enum';

export interface AuthCustomerSummaryResponse {
  id: string;
  name: string;
  email: string;
  document: string;
  type: CustomerType;
}

export interface AuthCustomerResponse {
  accessToken: string;
  refreshToken: string;
  customer: AuthCustomerSummaryResponse;
}

export interface AuthCustomerDataResponse {
  data: AuthCustomerResponse;
}
