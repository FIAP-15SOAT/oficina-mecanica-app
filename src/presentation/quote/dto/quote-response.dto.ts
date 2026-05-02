import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';

export class QuoteResponseDto {
  @ApiProperty({ description: 'ID do orçamento', format: 'uuid', example: 'f9b6e8e0-1c2d-4e5f-8a9b-0c1d2e3f4a5b' })
  id!: string;

  @ApiProperty({ description: 'ID da Ordem de Serviço associada', format: 'uuid', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  workOrderId!: string;

  @ApiProperty({ description: 'Status do orçamento', enum: QuoteStatus, example: QuoteStatus.PENDING })
  status!: QuoteStatus;

  @ApiPropertyOptional({ description: 'Observações do orçamento', nullable: true, example: 'Aguardando aprovação das peças' })
  notes!: string | null;

  @ApiPropertyOptional({ description: 'Data de envio ao cliente', nullable: true, example: '2023-10-27T10:00:00Z' })
  sentAt!: Date | null;

  @ApiPropertyOptional({ description: 'Data de aprovação', nullable: true, example: '2023-10-28T10:00:00Z' })
  approvedAt!: Date | null;

  @ApiPropertyOptional({ description: 'Data de rejeição', nullable: true, example: '2023-10-29T10:00:00Z' })
  rejectedAt!: Date | null;

  @ApiProperty({ description: 'Valor total dos serviços', example: 250.50 })
  servicesAmount!: number;

  @ApiProperty({ description: 'Valor total das peças', example: 120.00 })
  partsAmount!: number;

  @ApiProperty({ description: 'Valor total do orçamento', example: 370.50 })
  totalAmount!: number;

  @ApiProperty({ description: 'Data de criação', example: '2023-10-27T10:00:00Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data de última atualização', example: '2023-10-28T10:00:00Z' })
  updatedAt!: Date;
}

export class QuoteWithItemsResponseDto extends QuoteResponseDto {
  @ApiProperty({ description: 'Lista de serviços incluídos', type: [Object] })
  services!: QuoteService[];

  @ApiProperty({ description: 'Lista de peças/insumos incluídos', type: [Object] })
  partsSupplies!: QuotePartSupply[];
}

export class QuoteDataResponseDto {
  @ApiProperty({ type: QuoteResponseDto })
  data!: QuoteResponseDto;
}

export class QuoteWithItemsDataResponseDto {
  @ApiProperty({ type: QuoteWithItemsResponseDto })
  data!: QuoteWithItemsResponseDto;
}
