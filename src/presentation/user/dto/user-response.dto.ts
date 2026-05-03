import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@domain/enums/user-role.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
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

export class UserDataResponseDto {
  @ApiProperty({ type: UserResponseDto, description: 'Dados do usuário' })
  data!: UserResponseDto;
}

export class UserPaginatedResponseDto extends PaginatedResponseDto<UserResponseDto> {
  @ApiProperty({ type: [UserResponseDto], description: 'Usuários da página atual' })
  data!: UserResponseDto[];
}

export class UsersDataResponseDto {
  @ApiProperty({ type: [UserResponseDto], description: 'Lista de usuários' })
  data!: UserResponseDto[];
}
