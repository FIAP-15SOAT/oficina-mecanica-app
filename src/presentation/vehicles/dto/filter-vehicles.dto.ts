import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PLATE_REGEX } from '@domain/constants/plate.regex';

export class FilterVehiclesDto {
  @ApiPropertyOptional({ description: 'Número da página', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O número da página deve ser um inteiro.' })
  @Min(1, { message: 'O número da página deve ser no mínimo 1.' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite de itens deve ser um inteiro.' })
  @Min(1, { message: 'O limite de itens deve ser no mínimo 1.' })
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filtrar por ID do cliente', format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID do cliente deve ser um UUID válido.' })
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por marca (busca parcial)', example: 'Toyota' })
  @IsOptional()
  @IsString({ message: 'A marca deve ser um texto.' })
  brand?: string;

  @ApiPropertyOptional({ description: 'Filtrar por placa (exato)', example: 'ABC-1234' })
  @IsOptional()
  @Transform(({ value }) => value?.trim().toUpperCase())
  @IsString({ message: 'A placa deve ser um texto.' })
  @Matches(PLATE_REGEX, { message: 'Placa inválida. Use o formato antigo (ABC-1234) ou Mercosul (ABC1D23).' })
  plate?: string;
}
