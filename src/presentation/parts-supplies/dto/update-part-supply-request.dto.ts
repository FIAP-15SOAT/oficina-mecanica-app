import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

export class UpdatePartSupplyRequestDto {
  @ApiPropertyOptional({ description: 'Nome da Peça ou Insumo', example: 'Filtro de Óleo' })
  @IsOptional()
  @IsString({ message: 'O nome da Peça ou Insumo deve ser um texto.' })
  @MaxLength(150, { message: 'O nome deve ter no máximo 150 caracteres.' })
  name?: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada', example: 'Filtro para motor 1.0' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;

  @ApiPropertyOptional({ description: 'SKU único da Peça ou Insumo no Estoque', example: 'FO-001' })
  @IsOptional()
  @IsString({ message: 'O SKU deve ser um texto.' })
  @MaxLength(60, { message: 'O SKU deve ter no máximo 60 caracteres.' })
  sku?: string;

  @ApiPropertyOptional({
    description: 'Número de referência do fabricante ou fornecedor',
    example: 'MANN-W712',
  })
  @IsOptional()
  @IsString({ message: 'O número de referência do fabricante deve ser um texto.' })
  @MaxLength(60, { message: 'O número de referência deve ter no máximo 60 caracteres.' })
  partNumber?: string;

  @ApiPropertyOptional({
    enum: PartSupplyCategory,
    description: 'Categoria: PART (Peça) ou SUPPLY (Insumo)',
    example: PartSupplyCategory.PART,
  })
  @IsOptional()
  @IsEnum(PartSupplyCategory, { message: 'Categoria inválida. Use PART (Peça) ou SUPPLY (Insumo).' })
  category?: PartSupplyCategory;

  @ApiPropertyOptional({ enum: Unit, description: 'Unidade de medida', example: Unit.UN })
  @IsOptional()
  @IsEnum(Unit, { message: 'Unidade de medida inválida.' })
  unit?: Unit;

  @ApiPropertyOptional({ description: 'Preço de custo da Peça ou Insumo', example: 25.0 })
  @IsOptional()
  @IsNumber({}, { message: 'O preço de custo deve ser um número.' })
  @IsPositive({ message: 'O preço de custo deve ser positivo.' })
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Preço de venda da Peça ou Insumo', example: 45.0 })
  @IsOptional()
  @IsNumber({}, { message: 'O preço de venda deve ser um número.' })
  @IsPositive({ message: 'O preço de venda deve ser positivo.' })
  salePrice?: number;

  @ApiPropertyOptional({ description: 'Estoque mínimo para alerta de reposição', example: 2 })
  @IsOptional()
  @IsInt({ message: 'O estoque mínimo deve ser um número inteiro.' })
  @Min(0, { message: 'O estoque mínimo não pode ser negativo.' })
  minStock?: number;

  @ApiPropertyOptional({
    description: 'Data de validade da Peça ou Insumo (formato yyyy-MM-dd)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: 'A data de validade deve estar no formato yyyy-MM-dd.' })
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Status ativo/inativo da Peça ou Insumo no Estoque', example: true })
  @IsOptional()
  @IsBoolean({ message: 'O status deve ser true ou false.' })
  isActive?: boolean;
}
