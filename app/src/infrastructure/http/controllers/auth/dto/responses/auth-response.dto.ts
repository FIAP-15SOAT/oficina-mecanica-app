import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@domain/enums/user-role.enum';
import {
  AuthDataResponse,
  AuthResponse,
  AuthUserSummaryResponse,
} from '@interface-adapters/auth/responses/auth.response';

class AuthUserSummaryResponseDto implements AuthUserSummaryResponse {
  @ApiProperty({ example: 'uuid-here' })
  id!: string;

  @ApiProperty({ example: 'João Silva' })
  name!: string;

  @ApiProperty({ example: 'joao@email.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ATTENDANT })
  role!: UserRole;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserSummaryResponseDto })
  user!: AuthUserSummaryResponseDto;
}

export class AuthDataResponseDto implements AuthDataResponse {
  @ApiProperty({ type: AuthResponseDto, description: 'Dados de autenticação' })
  data!: AuthResponseDto;
}
