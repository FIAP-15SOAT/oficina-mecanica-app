import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '@presentation/common/dto/paginated-response.dto';

export class StockReservationResponseDto {
  @ApiProperty({ description: 'ID da reserva', example: 'f9b6e8e0-1c2d-4e5f-8a9b-0c1d2e3f4a5b' })
  id: string;

  @ApiProperty({ description: 'ID da peça/insumo', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  partSupplyId: string;

  @ApiProperty({ description: 'ID da Ordem de Serviço associada', example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  workOrderId: string;

  @ApiProperty({ description: 'Quantidade reservada', example: 5 })
  quantity: number;

  @ApiProperty({ description: 'Data de criação', example: '2023-10-27T10:00:00Z' })
  createdAt: Date;
}

export class StockReservationDataResponseDto {
  @ApiProperty({ type: StockReservationResponseDto })
  data: StockReservationResponseDto;
}

export class StockReservationPaginatedResponseDto extends PaginatedResponseDto<StockReservationResponseDto> {
  @ApiProperty({ type: [StockReservationResponseDto] })
  data: StockReservationResponseDto[];
}
