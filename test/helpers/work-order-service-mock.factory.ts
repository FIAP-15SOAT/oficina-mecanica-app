import { randomUUID } from 'node:crypto';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { IWorkOrderServiceRepository } from '@domain/interfaces/repositories/work-order-service.repository.interface';

export function createMockWorkOrderService(
  overrides: Partial<WorkOrderService> = {},
): WorkOrderService {
  const now = new Date();
  return new WorkOrderService({
    id: randomUUID(),
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

export function createMockWorkOrderServiceRepository(): jest.Mocked<IWorkOrderServiceRepository> {
  return {
    create: jest.fn(),
    findByWorkOrderAndService: jest.fn(),
    update: jest.fn(),
    isAllCompletedByWorkOrderId: jest.fn(),
  };
}
