import { ApiProperty } from '@nestjs/swagger';
import { CustomerType } from '@domain/enums/customer-type.enum';
import {
  AuthCustomerDataResponse,
  AuthCustomerResponse,
  AuthCustomerSummaryResponse,
} from '@interface-adapters/auth/responses/auth-customer.response';

class AuthCustomerSummaryResponseDto implements AuthCustomerSummaryResponse {
  @ApiProperty({ example: 'uuid-here' })
  id!: string;

  @ApiProperty({ example: 'João da Silva' })
  name!: string;

  @ApiProperty({ example: 'cliente@email.com' })
  email!: string;

  @ApiProperty({ example: '12345678909' })
  document!: string;

  @ApiProperty({ enum: CustomerType, example: CustomerType.INDIVIDUAL })
  type!: CustomerType;
}

export class AuthCustomerResponseDto implements AuthCustomerResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;

  @ApiProperty({ type: AuthCustomerSummaryResponseDto })
  customer!: AuthCustomerSummaryResponseDto;
}

export class AuthCustomerDataResponseDto implements AuthCustomerDataResponse {
  @ApiProperty({ type: AuthCustomerResponseDto, description: 'Dados de autenticação do cliente' })
  data!: AuthCustomerResponseDto;
}
