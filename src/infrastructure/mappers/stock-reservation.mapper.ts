import type {
  StockReservation as PrismaStockReservation,
  PartSupply as PrismaPartSupply,
  WorkOrder as PrismaWorkOrder,
  Customer as PrismaCustomer,
  Vehicle as PrismaVehicle,
  User as PrismaUser,
} from '@generated/client';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { PartSupplyMapper } from './part-supply.mapper';
import { WorkOrderMapper } from './work-order.mapper';

type PrismaStockReservationRecord = PrismaStockReservation & {
  partSupply?: PrismaPartSupply | null;
  workOrder?:
    | (PrismaWorkOrder & {
        customer?: PrismaCustomer | null;
        vehicle?: PrismaVehicle | null;
        assignedUser?: PrismaUser | null;
      })
    | null;
};

export class StockReservationMapper {
  static toDomain(record: PrismaStockReservationRecord): StockReservation {
    const entity = new StockReservation({
      id: record.id,
      partSupplyId: record.partSupplyId,
      workOrderId: record.workOrderId,
      quantity: record.quantity,
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
