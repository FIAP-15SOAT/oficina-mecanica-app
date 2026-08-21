import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@domain/enums/user-role.enum';
import { IsValidCpfCnpj } from '@infrastructure/http/validators/document.validator';
import { PASSWORD_REGEX } from '@domain/constants/regex/password.regex';
import { PASSWORD_REQUIREMENTS_MESSAGE } from '@domain/constants/validation/password.constants';
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
} from '@domain/constants/validation/user.constants';

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

  @ApiProperty({
    description: 'CPF (000.000.000-00) ou CNPJ válido, único',
    example: '123.456.789-09',
  })
  @Transform(({ value }: { value: string }) => value?.trim().replaceAll(/[.\-/]/g, '').toUpperCase())
  @IsString({ message: 'O documento deve ser um texto.' })
  @IsNotEmpty({ message: 'O documento é obrigatório' })
  @IsValidCpfCnpj()
  document!: string;

  @ApiProperty({
    example: 'Senha@123',
    description:
      'Senha (mín. 8 caracteres, com ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial)',
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ATTENDANT, description: 'Role do usuário' })
  @IsNotEmpty({ message: 'A role é obrigatória' })
  @IsEnum(UserRole, { message: 'Role inválida' })
  role!: UserRole;
}
