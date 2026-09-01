export interface GrantCustomerAccessDto {
  name?: string;
  email?: string;
  cpf?: string;
}

export interface GrantCustomerAccessOutputDto {
  userId: string;
  customerId: string;
  initialPasswordSent: boolean;
}
