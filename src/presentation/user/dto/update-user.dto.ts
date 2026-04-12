import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../domain/enums';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'João Silva', description: 'Nome completo (mín. 3 caracteres)' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres' })
  name?: string;

  @ApiPropertyOptional({ example: 'joao@email.com', description: 'E-mail único' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @ApiPropertyOptional({ example: 'NovaSenha@123', description: 'Nova senha (mín. 6 caracteres)' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.MECHANIC })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role inválida' })
  role?: UserRole;
}
