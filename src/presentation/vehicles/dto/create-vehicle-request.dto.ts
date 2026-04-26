import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PLATE_REGEX } from '@domain/constants/plate.regex';

export class CreateVehicleRequestDto {
  @ApiProperty({ description: 'ID do Cliente proprietário', format: 'uuid' })
  @IsUUID(undefined, { message: 'O ID do cliente deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do cliente é obrigatório.' })
  customerId: string;

  @ApiProperty({
    description: 'Placa do veículo — formato antigo (ABC-1234) ou Mercosul (ABC1D23)',
    example: 'ABC-1234',
  })
  @Transform(({ value }) => value?.trim().toUpperCase())
  @Matches(PLATE_REGEX, { message: 'Placa inválida. Use o formato antigo (ABC-1234) ou Mercosul (ABC1D23).' })
  @IsString({ message: 'A placa deve ser um texto.' })
  @IsNotEmpty({ message: 'A placa é obrigatória.' })
  plate: string;

  @ApiProperty({ description: 'Marca do veículo', example: 'Toyota' })
  @IsString({ message: 'A marca deve ser um texto.' })
  @IsNotEmpty({ message: 'A marca é obrigatória.' })
  @MaxLength(60, { message: 'A marca deve ter no máximo 60 caracteres.' })
  brand: string;

  @ApiProperty({ description: 'Modelo do veículo', example: 'Corolla' })
  @IsString({ message: 'O modelo deve ser um texto.' })
  @IsNotEmpty({ message: 'O modelo é obrigatório.' })
  @MaxLength(60, { message: 'O modelo deve ter no máximo 60 caracteres.' })
  model: string;

  @ApiProperty({ description: 'Ano de fabricação (mínimo 1950)', example: 2020 })
  @Type(() => Number)
  @IsInt({ message: 'O ano deve ser um número inteiro.' })
  @Min(1950, { message: 'O ano deve ser no mínimo 1950.' })
  year: number;

  @ApiPropertyOptional({ description: 'Cor do veículo', example: 'Prata', nullable: true })
  @IsOptional()
  @IsString({ message: 'A cor deve ser um texto.' })
  @MaxLength(40, { message: 'A cor deve ter no máximo 40 caracteres.' })
  color?: string | null;

  @ApiPropertyOptional({ description: 'Quilometragem atual', example: 50000, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A quilometragem deve ser um número inteiro.' })
  @Min(0, { message: 'A quilometragem não pode ser negativa.' })
  mileage?: number | null;
}
