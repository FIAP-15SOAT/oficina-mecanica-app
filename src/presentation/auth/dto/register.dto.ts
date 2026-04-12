import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../domain/enums';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo do usuário' })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  name!: string;

  @ApiProperty({ example: 'joao@email.com', description: 'E-mail do usuário (único)' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email!: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password!: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.ATTENDANT })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role inválida' })
  role?: UserRole;
}
