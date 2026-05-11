import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PLATE_REGEX } from '@domain/constants/regex/plate.regex';
import {
  MIN_BRAND_LENGTH,
  MAX_BRAND_LENGTH,
  MIN_MODEL_LENGTH,
  MAX_MODEL_LENGTH,
  MAX_COLOR_LENGTH,
  MIN_YEAR,
} from '@domain/constants/validation/vehicle.constants';

export class CreateVehicleRequestDto {
  @ApiProperty({ description: 'ID do Cliente proprietário', format: 'uuid' })
  @IsUUID(undefined, { message: 'O ID do cliente deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do cliente é obrigatório.' })
  customerId!: string;

  @ApiProperty({
    description: 'Placa do veículo — formato antigo (ABC-1234) ou Mercosul (ABC1D23)',
    example: 'ABC-1234',
  })
  @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
  @Matches(PLATE_REGEX, {
    message: 'Placa inválida. Use o formato antigo (ABC-1234) ou Mercosul (ABC1D23).',
  })
  @IsString({ message: 'A placa deve ser um texto.' })
  @IsNotEmpty({ message: 'A placa é obrigatória.' })
  plate!: string;

  @ApiProperty({ description: 'Marca do veículo', example: 'Toyota' })
  @IsString({ message: 'A marca deve ser um texto.' })
  @IsNotEmpty({ message: 'A marca é obrigatória.' })
  @MinLength(MIN_BRAND_LENGTH, {
    message: `A marca deve ter no mínimo ${MIN_BRAND_LENGTH} caracteres.`,
  })
  @MaxLength(MAX_BRAND_LENGTH, {
    message: `A marca deve ter no máximo ${MAX_BRAND_LENGTH} caracteres.`,
  })
  brand!: string;

  @ApiProperty({ description: 'Modelo do veículo', example: 'Corolla' })
  @IsString({ message: 'O modelo deve ser um texto.' })
  @IsNotEmpty({ message: 'O modelo é obrigatório.' })
  @MinLength(MIN_MODEL_LENGTH, {
    message: `O modelo deve ter no mínimo ${MIN_MODEL_LENGTH} caracteres.`,
  })
  @MaxLength(MAX_MODEL_LENGTH, {
    message: `O modelo deve ter no máximo ${MAX_MODEL_LENGTH} caracteres.`,
  })
  model!: string;

  @ApiProperty({ description: `Ano de fabricação (mínimo ${MIN_YEAR})`, example: 2020 })
  @Type(() => Number)
  @IsInt({ message: 'O ano deve ser um número inteiro.' })
  @Min(MIN_YEAR, { message: `O ano deve ser no mínimo ${MIN_YEAR}.` })
  year!: number;

  @ApiPropertyOptional({ description: 'Cor do veículo', example: 'Prata', nullable: true })
  @IsOptional()
  @IsString({ message: 'A cor deve ser um texto.' })
  @MaxLength(MAX_COLOR_LENGTH, {
    message: `A cor deve ter no máximo ${MAX_COLOR_LENGTH} caracteres.`,
  })
  color?: string | null;

  @ApiPropertyOptional({ description: 'Quilometragem atual', example: 50000, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A quilometragem deve ser um número inteiro.' })
  @Min(0, { message: 'A quilometragem não pode ser negativa.' })
  mileage?: number | null;
}
