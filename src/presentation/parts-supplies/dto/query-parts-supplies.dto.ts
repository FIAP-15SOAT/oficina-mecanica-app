import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';

/** Query params para Consulta de Estoque de Peças e Insumos */
export class QueryPartsSuppliesDto {
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
    description: 'Busca por nome ou SKU da Peça ou Insumo',
    example: 'Filtro',
  })
  @IsOptional()
  @IsString({ message: 'O termo de busca deve ser um texto.' })
  search?: string;

  @ApiPropertyOptional({
    enum: PartSupplyCategory,
    description: 'Filtrar por categoria: PART (Peça) ou SUPPLY (Insumo)',
  })
  @IsOptional()
  @IsEnum(PartSupplyCategory, { message: 'Categoria inválida. Use PART (Peça) ou SUPPLY (Insumo).' })
  category?: PartSupplyCategory;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo/inativo no Estoque' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'O filtro de status deve ser true ou false.' })
  isActive?: boolean;
}
