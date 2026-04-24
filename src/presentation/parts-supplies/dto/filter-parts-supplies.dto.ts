import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';

/** Filtros para Consulta de Estoque de Peças e Insumos */
export class FilterPartsSuppliesDto {
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

  @ApiPropertyOptional({
    description: 'Filtrar por nome da Peça ou Insumo',
    example: 'Filtro de Óleo',
  })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;

  @ApiPropertyOptional({ description: 'Filtrar por SKU da Peça ou Insumo', example: 'FO-001' })
  @IsOptional()
  @IsString({ message: 'O SKU deve ser um texto.' })
  sku?: string;

  @ApiPropertyOptional({
    enum: PartSupplyCategory,
    description: 'Filtrar por categoria: PART (Peça) ou SUPPLY (Insumo)',
  })
  @IsOptional()
  @IsEnum(PartSupplyCategory, {
    message: 'Categoria inválida. Use PART (Peça) ou SUPPLY (Insumo).',
  })
  category?: PartSupplyCategory;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo/inativo no Estoque' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'O filtro de status deve ser true ou false.' })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar apenas itens com estoque abaixo do mínimo' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'O filtro de estoque baixo deve ser true ou false.' })
  lowStock?: boolean;
}
