import type {
  WorkOrderService as PrismaWorkOrderService,
  Service as PrismaService,
} from '@generated/client';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { ServiceMapper } from './service.mapper';

type PrismaWorkOrderServiceRecord = PrismaWorkOrderService & {
  service?: PrismaService | null;
};

export class WorkOrderServiceMapper {
  static toDomain(record: PrismaWorkOrderServiceRecord): WorkOrderService {
    const entity = WorkOrderService.reconstitute({
      workOrderId: record.workOrderId,
      serviceId: record.serviceId,
      quantity: record.quantity,
      unitPrice: Number(record.unitPrice),
      totalPrice: Number(record.totalPrice),
      status: record.status as WorkOrderServiceStatus,
      startedAt: record.startedAt ?? null,
      finishedAt: record.finishedAt ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    if (record.service) {
      entity.service = ServiceMapper.toDomain(record.service);
    }

    return entity;
  }
}
