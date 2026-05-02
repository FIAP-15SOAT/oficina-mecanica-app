import type { StockMovement as PrismaStockMovement } from '@generated/client';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';

export class StockMovementMapper {
  static toDomain(record: PrismaStockMovement): StockMovement {
    return new StockMovement({
      id: record.id,
      partSupplyId: record.partSupplyId,
      workOrderId: record.workOrderId ?? null,
      type: record.type as StockMovementType,
      quantity: record.quantity,
      reason: record.reason ?? null,
      createdAt: record.createdAt,
    });
  }


}
