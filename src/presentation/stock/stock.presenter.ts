import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { StockReservationResponseDto } from './dto/stock-reservation-response.dto';

export class StockPresenter {
  static toPaginatedStockMovementsResponse(
    result: PaginatedResult<StockMovement>,
  ) {
    return {
      data: result.items.map((item) => this.toStockMovementResponse(item)),
      pagination: result.pagination,
    };
  }

  static toPaginatedStockReservationsResponse(
    result: PaginatedResult<StockReservation>,
  ) {
    return {
      data: result.items.map((item) => this.toStockReservationResponse(item)),
      pagination: result.pagination,
    };
  }

  private static toStockMovementResponse(item: StockMovement): StockMovementResponseDto {
    return {
      id: item.id,
      partSupplyId: item.partSupplyId,
      workOrderId: item.workOrderId,
      type: item.type,
      quantity: item.quantity,
      reason: item.reason,
      createdAt: item.createdAt,
    };
  }

  private static toStockReservationResponse(item: StockReservation): StockReservationResponseDto {
    return {
      id: item.id,
      partSupplyId: item.partSupplyId,
      workOrderId: item.workOrderId,
      quantity: item.quantity,
      createdAt: item.createdAt,
    };
  }
}
