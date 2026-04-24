import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsString({ message: 'A placa deve ser um texto.' })
  plate?: string;
}
