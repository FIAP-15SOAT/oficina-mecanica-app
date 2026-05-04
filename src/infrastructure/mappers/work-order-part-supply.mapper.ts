import type { WorkOrderPartSupply as PrismaWorkOrderPartSupply, PartSupply as PrismaPartSupply } from '@generated/client';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { PartSupplyMapper } from './part-supply.mapper';

type PrismaWorkOrderPartSupplyRecord = PrismaWorkOrderPartSupply & {
  partSupply?: PrismaPartSupply | null;
};

export class WorkOrderPartSupplyMapper {
  static toDomain(record: PrismaWorkOrderPartSupplyRecord): WorkOrderPartSupply {
    const entity = new WorkOrderPartSupply({
      workOrderId: record.workOrderId,
      partSupplyId: record.partSupplyId,
      quantity: record.quantity,
      unitPrice: Number(record.unitPrice),
      totalPrice: Number(record.totalPrice),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    if (record.partSupply) {
      entity.partSupply = PartSupplyMapper.toDomain(record.partSupply);
    }

    return entity;
  }
}
