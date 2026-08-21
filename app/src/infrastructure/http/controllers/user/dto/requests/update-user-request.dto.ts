import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@domain/enums/user-role.enum';
import { IsValidCpfCnpj } from '@infrastructure/http/validators/document.validator';
import { PASSWORD_REGEX } from '@domain/constants/regex/password.regex';
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '@domain/constants/validation/user.constants';

export class UpdateUserRequestDto {
  @ApiPropertyOptional({ example: 'João Silva', description: 'Nome completo (mín. 3 caracteres)' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  @MinLength(MIN_NAME_LENGTH, {
    message: `O nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`,
  })
  @MaxLength(MAX_NAME_LENGTH, {
    message: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`,
  })
  name?: string;

  @ApiPropertyOptional({ example: 'joao@email.com', description: 'E-mail único' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @ApiPropertyOptional({
    description: 'CPF (000.000.000-00) ou CNPJ válido, único',
    example: '123.456.789-09',
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.replaceAll(/[.\-/]/g, '').toUpperCase())
  @IsString({ message: 'O documento deve ser um texto.' })
  @IsValidCpfCnpj()
  document?: string;

  @ApiPropertyOptional({
    example: 'NovaSenha@123',
    description:
      'Nova senha (mín. 8 caracteres, com ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial)',
  })
  @IsOptional()
  @IsString({ message: 'A senha deve ser um texto.' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.MECHANIC })
  @IsOptional()
  @IsEnum(UserRole, {
    message: `A role deve ser uma das seguintes: ${Object.values(UserRole).join(', ')}`,
  })
  role?: UserRole;
}
