import type { StockReservation as PrismaStockReservation } from '@generated/client';
import { StockReservation } from '@domain/entities/stock-reservation.entity';

export class StockReservationMapper {
  static toDomain(record: PrismaStockReservation): StockReservation {
    return new StockReservation({
      id: record.id,
      partSupplyId: record.partSupplyId,
      workOrderId: record.workOrderId,
      quantity: record.quantity,
      createdAt: record.createdAt,
    });
  }


}
