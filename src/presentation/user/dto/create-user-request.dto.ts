import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@domain/enums/user-role.enum';
import { MIN_NAME_LENGTH, MAX_NAME_LENGTH } from '@domain/constants/validation/user.constants';

export class CreateUserRequestDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo (mín. 3 caracteres)' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MinLength(MIN_NAME_LENGTH, {
    message: `O nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`,
  })
  @MaxLength(MAX_NAME_LENGTH, {
    message: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`,
  })
  name!: string;

  @ApiProperty({ example: 'joao@email.com', description: 'E-mail único' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email!: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha (mín. 6 caracteres)' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ATTENDANT, description: 'Role do usuário' })
  @IsNotEmpty({ message: 'A role é obrigatória' })
  @IsEnum(UserRole, { message: 'Role inválida' })
  role!: UserRole;
}
