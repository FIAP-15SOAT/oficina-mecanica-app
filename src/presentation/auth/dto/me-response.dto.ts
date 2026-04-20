import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@domain/enums/user-role.enum';

export class MeResponseDto {
  @ApiProperty({ example: 'uuid-here' })
  id!: string;

  @ApiProperty({ example: 'João Silva' })
  name!: string;

  @ApiProperty({ example: 'joao@email.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ATTENDANT })
  role!: UserRole;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z', format: 'date-time' })
  updatedAt!: Date;
}

export class MeDataResponseDto {
  @ApiProperty({ type: MeResponseDto, description: 'Dados do usuário autenticado' })
  data!: MeResponseDto;
}
