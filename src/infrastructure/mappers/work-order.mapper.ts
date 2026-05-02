import type { WorkOrder as PrismaWorkOrder } from '@generated/client';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export class WorkOrderMapper {
  static toDomain(record: PrismaWorkOrder): WorkOrder {
    return new WorkOrder({
      id: record.id,
      number: record.number,
      customerId: record.customerId,
      vehicleId: record.vehicleId,
      assignedUserId: record.assignedUserId ?? null,
      status: record.status as WorkOrderStatus,
      problemDescription: record.problemDescription ?? null,
      internalNotes: record.internalNotes ?? null,
      mileageAtService: record.mileageAtService ?? null,
      totalAmount: Number(record.totalAmount),
      approvedAt: record.approvedAt ?? null,
      rejectedAt: record.rejectedAt ?? null,
      startedAt: record.startedAt ?? null,
      finishedAt: record.finishedAt ?? null,
      deliveredAt: record.deliveredAt ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
