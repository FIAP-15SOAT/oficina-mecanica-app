import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { WorkOrderResponseDto } from '../../work-order/dto/work-order-response.dto';

export class QuoteServiceItemResponseDto {
  @ApiProperty({
    description: 'ID do serviço',
    format: 'uuid',
    example: '4f7ce3e3-672d-472a-b2d4-a896809015e6',
  })
  id!: string;

  @ApiProperty({ description: 'Nome do serviço', example: 'Troca de óleo' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição do serviço',
    nullable: true,
    example: 'Troca de óleo com filtro',
  })
  description!: string | null;

  @ApiProperty({ description: 'Quantidade', example: 2 })
  quantity!: number;

  @ApiProperty({ description: 'Preço unitário', example: 129.9 })
  unitPrice!: number;

  @ApiProperty({ description: 'Preço total', example: 259.8 })
  totalPrice!: number;

  @ApiProperty({ description: 'Data de criação', example: '2026-05-08T09:52:54.102-03:00' })
  createdAt!: Date;

  @ApiProperty({
    description: 'Data de última atualização',
    example: '2026-05-08T09:52:59.754-03:00',
  })
  updatedAt!: Date;
}

export class QuotePartSupplyItemResponseDto {
  @ApiProperty({
    description: 'ID da peça/insumo',
    format: 'uuid',
    example: 'a2e1790b-fc57-4855-8749-268b6ce72d21',
  })
  id!: string;

  @ApiProperty({ description: 'Nome da peça/insumo', example: 'Filtro de Óleo' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada',
    nullable: true,
    example: 'Filtro para motor 1.0',
  })
  description!: string | null;

  @ApiProperty({ description: 'SKU único no Estoque', example: 'FO-001' })
  sku!: string;

  @ApiPropertyOptional({
    description: 'Número de referência do fabricante',
    nullable: true,
    example: 'MANN-W712',
  })
  partNumber!: string | null;

  @ApiProperty({
    enum: PartSupplyCategory,
    description: 'Categoria: PART (Peça) ou SUPPLY (Insumo)',
    example: PartSupplyCategory.PART,
  })
  category!: PartSupplyCategory;

  @ApiProperty({ enum: Unit, description: 'Unidade de medida', example: Unit.UN })
  unit!: Unit;

  @ApiProperty({ description: 'Quantidade', example: 1 })
  quantity!: number;

  @ApiProperty({ description: 'Preço unitário', example: 45.0 })
  unitPrice!: number;

  @ApiProperty({ description: 'Preço total', example: 45.0 })
  totalPrice!: number;

  @ApiProperty({ description: 'Data de criação', example: '2026-05-08T09:51:11.226-03:00' })
  createdAt!: Date;

  @ApiProperty({
    description: 'Data de última atualização',
    example: '2026-05-08T09:51:11.226-03:00',
  })
  updatedAt!: Date;
}

export class QuoteResponseDto {
  @ApiProperty({
    description: 'ID do orçamento',
    format: 'uuid',
    example: 'f9b6e8e0-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
  })
  id!: string;

  @ApiProperty({
    description: 'Dados da Ordem de Serviço associada',
    type: [WorkOrderResponseDto],
  })
  workOrder!: WorkOrderResponseDto;

  @ApiProperty({
    description: 'Status do orçamento',
    enum: QuoteStatus,
    example: QuoteStatus.PENDING,
  })
  status!: QuoteStatus;

  @ApiPropertyOptional({
    description: 'Observações do orçamento',
    nullable: true,
    example: 'Aguardando aprovação das peças',
  })
  notes!: string | null;

  @ApiPropertyOptional({
    description: 'Data de envio ao cliente',
    nullable: true,
    example: '2023-10-27T10:00:00Z',
  })
  sentAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Data de aprovação',
    nullable: true,
    example: '2023-10-28T10:00:00Z',
  })
  approvedAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Data de rejeição',
    nullable: true,
    example: '2023-10-29T10:00:00Z',
  })
  rejectedAt!: Date | null;

  @ApiProperty({ description: 'Valor total dos serviços', example: 250.5 })
  servicesAmount!: number;

  @ApiProperty({ description: 'Valor total das peças', example: 120.0 })
  partsAmount!: number;

  @ApiProperty({ description: 'Valor total do orçamento', example: 370.5 })
  totalAmount!: number;

  @ApiProperty({ description: 'Data de criação', example: '2023-10-27T10:00:00Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data de última atualização', example: '2023-10-28T10:00:00Z' })
  updatedAt!: Date;
}

export class QuoteWithItemsResponseDto extends QuoteResponseDto {
  @ApiProperty({ description: 'Lista de serviços incluídos', type: [QuoteServiceItemResponseDto] })
  services!: QuoteServiceItemResponseDto[];

  @ApiProperty({
    description: 'Lista de peças/insumos incluídos',
    type: [QuotePartSupplyItemResponseDto],
  })
  partsSupplies!: QuotePartSupplyItemResponseDto[];
}

export class QuoteDataResponseDto {
  @ApiProperty({ type: QuoteResponseDto })
  data!: QuoteResponseDto;
}

export class QuoteWithItemsDataResponseDto {
  @ApiProperty({ type: QuoteWithItemsResponseDto })
  data!: QuoteWithItemsResponseDto;
}

export class QuoteListResponseDto {
  @ApiProperty({ type: [QuoteResponseDto] })
  data!: QuoteResponseDto[];
}

export class QuotePaginatedResponseDto extends PaginatedResponseDto<QuoteResponseDto> {
  @ApiProperty({ type: [QuoteResponseDto] })
  data!: QuoteResponseDto[];
}
