import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';

export class GrantCustomerAccessRequestDto {
  @ApiPropertyOptional({
    example: 'João Silva',
    description: 'Nome do operador (obrigatório para cliente COMPANY)',
  })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  @MaxLength(150, { message: 'O nome deve ter no máximo 150 caracteres.' })
  name?: string;

  @ApiPropertyOptional({
    example: 'joao@email.com',
    description: 'E-mail do operador (obrigatório para cliente COMPANY)',
  })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  email?: string;

  @ApiPropertyOptional({
    example: '123.456.789-09',
    description: 'CPF do operador (obrigatório para cliente COMPANY)',
  })
  @IsOptional()
  @IsString({ message: 'O CPF deve ser um texto.' })
  cpf?: string;
}
