import { ApiProperty } from '@nestjs/swagger';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PaginatedResponseDto } from '@presentation/common/dto/paginated-response.dto';

export class StockMovementResponseDto {
  @ApiProperty({ description: 'ID da movimentação', example: 'f9b6e8e0-1c2d-4e5f-8a9b-0c1d2e3f4a5b' })
  id: string;

  @ApiProperty({ description: 'ID da peça/insumo', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  partSupplyId: string;

  @ApiProperty({ description: 'ID da Ordem de Serviço associada', required: false, nullable: true, example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  workOrderId?: string | null;

  @ApiProperty({ description: 'Tipo de movimentação', enum: StockMovementType, example: StockMovementType.ENTRY })
  type: StockMovementType;

  @ApiProperty({ description: 'Quantidade movimentada', example: 10 })
  quantity: number;

  @ApiProperty({ description: 'Motivo da movimentação', required: false, nullable: true, example: 'Recebimento de pedido' })
  reason?: string | null;

  @ApiProperty({ description: 'Data de criação', example: '2023-10-27T10:00:00Z' })
  createdAt: Date;
}

export class StockMovementDataResponseDto {
  @ApiProperty({ type: StockMovementResponseDto })
  data: StockMovementResponseDto;
}

export class StockMovementPaginatedResponseDto extends PaginatedResponseDto<StockMovementResponseDto> {
  @ApiProperty({ type: [StockMovementResponseDto] })
  data: StockMovementResponseDto[];
}
