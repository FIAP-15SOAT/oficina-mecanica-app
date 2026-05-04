import type {
  StockMovement as PrismaStockMovement,
  PartSupply as PrismaPartSupply,
  WorkOrder as PrismaWorkOrder,
  Customer as PrismaCustomer,
  Vehicle as PrismaVehicle,
  User as PrismaUser,
} from '@generated/client';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PartSupplyMapper } from './part-supply.mapper';
import { WorkOrderMapper } from './work-order.mapper';

type PrismaStockMovementRecord = PrismaStockMovement & {
  partSupply?: PrismaPartSupply | null;
  workOrder?: (PrismaWorkOrder & {
    customer?: PrismaCustomer | null;
    vehicle?: PrismaVehicle | null;
    assignedUser?: PrismaUser | null;
  }) | null;
};

export class StockMovementMapper {
  static toDomain(record: PrismaStockMovementRecord): StockMovement {
    const entity = new StockMovement({
      id: record.id,
      partSupplyId: record.partSupplyId,
      workOrderId: record.workOrderId ?? null,
      type: record.type as StockMovementType,
      quantity: record.quantity,
      reason: record.reason ?? null,
      createdAt: record.createdAt,
    });

    if (record.partSupply) {
      entity.partSupply = PartSupplyMapper.toDomain(record.partSupply);
    }
    if (record.workOrder) {
      entity.workOrder = WorkOrderMapper.toDomain(record.workOrder);
    }

    return entity;
  }
}
