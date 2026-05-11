import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsEmail,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
  Length,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { IsValidCpfCnpj } from '@infrastructure/validators/document.validator';
import { PHONE_REGEX } from '@domain/constants/regex/phone.regex';
import { MIN_NAME_LENGTH, MAX_NAME_LENGTH } from '@domain/constants/validation/customer.constants';

export class AddressRequestDto {
  @ApiProperty({ description: 'Logradouro', example: 'Rua das Flores, 123' })
  @IsString({ message: 'Logradouro deve ser um texto.' })
  @IsNotEmpty({ message: 'Logradouro é obrigatório.' })
  @MaxLength(255, { message: 'Logradouro deve ter no máximo 255 caracteres.' })
  street!: string;

  @ApiProperty({ description: 'Cidade', example: 'São Paulo' })
  @IsString({ message: 'Cidade deve ser um texto.' })
  @IsNotEmpty({ message: 'Cidade é obrigatória.' })
  @MaxLength(100, { message: 'Cidade deve ter no máximo 100 caracteres.' })
  city!: string;

  @ApiProperty({ description: 'UF (2 letras)', example: 'SP' })
  @IsString({ message: 'Estado deve ser um texto.' })
  @Length(2, 2, { message: 'Estado deve ter exatamente 2 caracteres (ex: SP).' })
  state!: string;

  @ApiProperty({ description: 'CEP (com ou sem hífen)', example: '01310-100' })
  @Transform(({ value }: { value: string }) => value?.replaceAll(/\D/g, ''))
  @IsString({ message: 'CEP deve ser um texto.' })
  @Matches(/^\d{8}$/, { message: 'CEP inválido. Formato esperado: 00000-000.' })
  zipCode!: string;
}

export class CreateCustomerRequestDto {
  @ApiProperty({ description: 'Nome completo do Cliente', example: 'João da Silva' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MinLength(MIN_NAME_LENGTH, {
    message: `O nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres.`,
  })
  @MaxLength(MAX_NAME_LENGTH, {
    message: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`,
  })
  name!: string;

  @ApiProperty({
    description: 'CPF (000.000.000-00) ou CNPJ válido (suporta formato alfanumérico)',
    example: '123.456.789-09',
  })
  @Transform(({ value }: { value: string }) => value?.replaceAll(/[.\-/]/g, '').toUpperCase())
  @IsString({ message: 'O documento deve ser um texto.' })
  @IsNotEmpty({ message: 'O documento é obrigatório.' })
  @IsValidCpfCnpj()
  document!: string;

  @ApiProperty({
    enum: CustomerType,
    description: 'Tipo de pessoa: INDIVIDUAL (Física) ou COMPANY (Jurídica)',
    example: CustomerType.INDIVIDUAL,
  })
  @IsEnum(CustomerType, { message: 'Tipo inválido. Use INDIVIDUAL ou COMPANY.' })
  type!: CustomerType;

  @ApiProperty({ description: 'E-mail do Cliente', example: 'joao@email.com' })
  @IsString({ message: 'O e-mail deve ser um texto.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  @IsEmail({}, { message: 'E-mail inválido.' })
  email!: string;

  @ApiProperty({ description: 'Telefone do Cliente', example: '(11) 99999-9999' })
  @Transform(({ value }: { value: string }) => value?.replaceAll(/\D/g, ''))
  @IsString({ message: 'O telefone deve ser um texto.' })
  @IsNotEmpty({ message: 'O telefone é obrigatório.' })
  @Matches(PHONE_REGEX, {
    message: 'Telefone inválido. Use o formato (11) 99999-9999 ou 99999-9999.',
  })
  phone!: string;

  @ApiProperty({ type: AddressRequestDto, description: 'Endereço do Cliente' })
  @ValidateNested()
  @Type(() => AddressRequestDto)
  address!: AddressRequestDto;
}
