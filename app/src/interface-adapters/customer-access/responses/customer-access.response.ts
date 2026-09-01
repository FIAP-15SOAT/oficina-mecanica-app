export interface CustomerAccessResponse {
  userId: string;
  customerId: string;
  initialPasswordSent: boolean;
}

export interface CustomerAccessDataResponse {
  data: CustomerAccessResponse;
}
