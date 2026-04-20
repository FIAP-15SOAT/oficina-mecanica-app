import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

/** Resposta da API para Peças e Insumos do Estoque */
export class PartSupplyResponseDto {
  @ApiProperty({ description: 'ID único da Peça ou Insumo' })
  id: string;

  @ApiProperty({ description: 'Nome da Peça ou Insumo' })
  name: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada' })
  description?: string;

  @ApiProperty({ description: 'SKU único no Estoque' })
  sku: string;

  @ApiPropertyOptional({ description: 'Número de referência do fabricante ou fornecedor' })
  partNumber?: string;

  @ApiProperty({
    enum: PartSupplyCategory,
    description: 'Categoria: PART (Peça) ou SUPPLY (Insumo)',
  })
  category: PartSupplyCategory;

  @ApiProperty({ enum: Unit, description: 'Unidade de medida' })
  unit: Unit;

  @ApiProperty({ description: 'Preço de custo' })
  costPrice: number;

  @ApiProperty({ description: 'Preço de venda' })
  salePrice: number;

  @ApiProperty({ description: 'Quantidade disponível no Estoque' })
  stock: number;

  @ApiProperty({ description: 'Estoque mínimo para alerta de Reposição de Estoque' })
  minStock: number;

  @ApiPropertyOptional({ description: 'Data de validade da Peça ou Insumo' })
  expiresAt?: Date;

  @ApiProperty({ description: 'Indica se a Peça ou Insumo está ativo no Estoque' })
  isActive: boolean;

  @ApiProperty({ description: 'Data de cadastro' })
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  updatedAt: Date;
}
