import { randomUUID } from 'node:crypto';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';

export function createMockWorkOrderService(
  overrides: Partial<WorkOrderService> = {},
): WorkOrderService {
  const now = new Date();

  return WorkOrderService.reconstitute({
    workOrderId: randomUUID(),
    serviceId: randomUUID(),
    quantity: 1,
    unitPrice: 100,
    totalPrice: 100,
    status: WorkOrderServiceStatus.PENDING,
    startedAt: null,
    finishedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}
