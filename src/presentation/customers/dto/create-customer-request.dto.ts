import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsEmail, MaxLength } from 'class-validator';
import { CustomerType } from '@domain/enums/customer-type.enum';

export class CreateCustomerRequestDto {
  @ApiProperty({ description: 'Nome completo do Cliente', example: 'João da Silva' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(150, { message: 'O nome deve ter no máximo 150 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)',
    example: '123.456.789-09',
  })
  @IsString({ message: 'O documento deve ser um texto.' })
  @IsNotEmpty({ message: 'O documento é obrigatório.' })
  document: string;

  @ApiProperty({
    enum: CustomerType,
    description: 'Tipo de pessoa: INDIVIDUAL (Física) ou COMPANY (Jurídica)',
    example: CustomerType.INDIVIDUAL,
  })
  @IsEnum(CustomerType, { message: 'Tipo inválido. Use INDIVIDUAL ou COMPANY.' })
  type: CustomerType;

  @ApiProperty({ description: 'E-mail do Cliente', example: 'joao@email.com' })
  @IsString({ message: 'O e-mail deve ser um texto.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  @ApiProperty({ description: 'Telefone do Cliente', example: '(11) 99999-9999' })
  @IsString({ message: 'O telefone deve ser um texto.' })
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  @MaxLength(20, { message: 'O telefone deve ter no máximo 20 caracteres.' })
  phone: string;
}
