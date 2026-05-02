import type { StatusHistory as PrismaStatusHistory } from '@generated/client';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export class StatusHistoryMapper {
  static toDomain(record: PrismaStatusHistory): StatusHistory {
    return new StatusHistory({
      id: record.id,
      workOrderId: record.workOrderId,
      changedById: record.changedById ?? null,
      previousStatus: record.previousStatus ? (record.previousStatus as WorkOrderStatus) : null,
      newStatus: record.newStatus as WorkOrderStatus,
      notes: record.notes ?? null,
      createdAt: record.createdAt,
    });
  }


}
