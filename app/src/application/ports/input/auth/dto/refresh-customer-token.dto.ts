export interface RefreshCustomerTokenInputDto {
  refreshToken: string;
}

export interface RefreshCustomerTokenOutputDto {
  accessToken: string;
  refreshToken: string;
}
