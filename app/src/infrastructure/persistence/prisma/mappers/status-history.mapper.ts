import type { StatusHistory as PrismaStatusHistory, User as PrismaUser } from '@generated/client';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { UserMapper } from './user.mapper';

type PrismaStatusHistoryRecord = PrismaStatusHistory & {
  changedBy?: PrismaUser | null;
};

export class StatusHistoryMapper {
  static toDomain(record: PrismaStatusHistoryRecord): StatusHistory {
    const entity = StatusHistory.reconstitute({
      id: record.id,
      workOrderId: record.workOrderId,
      changedById: record.changedById ?? null,
      previousStatus: record.previousStatus ? (record.previousStatus as WorkOrderStatus) : null,
      newStatus: record.newStatus as WorkOrderStatus,
      notes: record.notes ?? null,
      createdAt: record.createdAt,
    });

    if (record.changedBy) {
      entity.changedBy = UserMapper.toDomain(record.changedBy);
    }

    return entity;
  }
}
