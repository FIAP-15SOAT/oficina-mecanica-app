import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';

export class GrantCustomerAccessRequestDto {
  @ApiPropertyOptional({ description: 'Nome do operador (obrigatório para cliente COMPANY)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: 'E-mail do operador (obrigatório para cliente COMPANY)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'CPF do operador (obrigatório para cliente COMPANY)' })
  @IsOptional()
  @IsString()
  cpf?: string;
}
