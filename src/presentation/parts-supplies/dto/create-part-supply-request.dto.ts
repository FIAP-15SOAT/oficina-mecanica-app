import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

export class CreatePartSupplyRequestDto {
  @ApiProperty({ description: 'Nome da Peça ou Insumo', example: 'Filtro de Óleo' })
  @IsString({ message: 'O nome da Peça ou Insumo deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da Peça ou Insumo é obrigatório.' })
  @MaxLength(150, { message: 'O nome deve ter no máximo 150 caracteres.' })
  name!: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada', example: 'Filtro para motor 1.0' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;

  @ApiProperty({ description: 'SKU único da Peça ou Insumo no Estoque', example: 'FO-001' })
  @IsString({ message: 'O SKU deve ser um texto.' })
  @IsNotEmpty({ message: 'O SKU é obrigatório.' })
  @MaxLength(60, { message: 'O SKU deve ter no máximo 60 caracteres.' })
  sku!: string;

  @ApiPropertyOptional({
    description: 'Número de referência do fabricante ou fornecedor',
    example: 'MANN-W712',
  })
  @IsOptional()
  @IsString({ message: 'O número de referência do fabricante deve ser um texto.' })
  @MaxLength(60, { message: 'O número de referência deve ter no máximo 60 caracteres.' })
  partNumber?: string;

  @ApiProperty({
    enum: PartSupplyCategory,
    description: 'Categoria: PART (Peça) ou SUPPLY (Insumo)',
    example: PartSupplyCategory.PART,
  })
  @IsEnum(PartSupplyCategory, {
    message: 'Categoria inválida. Use PART (Peça) ou SUPPLY (Insumo).',
  })
  category!: PartSupplyCategory;

  @ApiProperty({ enum: Unit, description: 'Unidade de medida', example: Unit.UN })
  @IsEnum(Unit, { message: 'Unidade de medida inválida.' })
  unit!: Unit;

  @ApiProperty({ description: 'Preço de custo da Peça ou Insumo', example: 25.0 })
  @IsNumber({}, { message: 'O preço de custo deve ser um número.' })
  @IsPositive({ message: 'O preço de custo deve ser positivo.' })
  costPrice!: number;

  @ApiProperty({ description: 'Preço de venda da Peça ou Insumo', example: 45.0 })
  @IsNumber({}, { message: 'O preço de venda deve ser um número.' })
  @IsPositive({ message: 'O preço de venda deve ser positivo.' })
  salePrice!: number;

  @ApiPropertyOptional({ description: 'Quantidade inicial no Estoque', example: 10, default: 0 })
  @IsOptional()
  @IsInt({ message: 'A quantidade em estoque deve ser um número inteiro.' })
  @Min(0, { message: 'A quantidade em estoque não pode ser negativa.' })
  stock?: number;

  @ApiPropertyOptional({
    description: 'Estoque mínimo para alerta de reposição',
    example: 2,
    default: 0,
  })
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
}
