import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@domain/enums/user-role.enum';
import { MeDataResponse, MeResponse } from '@interface-adapters/auth/responses/auth.response';

export class MeResponseDto implements MeResponse {
  @ApiProperty({ example: 'uuid-here' })
  id!: string;

  @ApiProperty({ example: 'João Silva' })
  name!: string;

  @ApiProperty({ example: 'joao@email.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ATTENDANT, nullable: true })
  role!: UserRole | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z', format: 'date-time' })
  updatedAt!: Date;
}

export class MeDataResponseDto implements MeDataResponse {
  @ApiProperty({ type: MeResponseDto, description: 'Dados do usuário autenticado' })
  data!: MeResponseDto;
}
