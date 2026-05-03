import { randomUUID } from 'node:crypto';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { IStatusHistoryRepository } from '@domain/interfaces/repositories/status-history.repository.interface';

export function createMockStatusHistory(
  overrides: Partial<StatusHistory> = {},
): StatusHistory {
  return new StatusHistory({
    id: randomUUID(),
    workOrderId: randomUUID(),
    changedById: randomUUID(),
    previousStatus: WorkOrderStatus.RECEIVED,
    newStatus: WorkOrderStatus.IN_DIAGNOSIS,
    notes: null,
    createdAt: new Date(),
    ...overrides,
  });
}

export function createMockStatusHistoryRepository(): jest.Mocked<IStatusHistoryRepository> {
  return {
    create: jest.fn(),
    findByWorkOrderId: jest.fn(),
  };
}
