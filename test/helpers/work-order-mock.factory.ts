import { randomUUID } from 'crypto';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';

export function createMockWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  const now = new Date();
  return new WorkOrder({
    id: randomUUID(),
    number: '000001',
    customerId: randomUUID(),
    vehicleId: randomUUID(),
    assignedUserId: null,
    status: WorkOrderStatus.RECEIVED,
    problemDescription: null,
    internalNotes: null,
    mileageAtService: null,
    totalAmount: 0,
    approvedAt: null,
    startedAt: null,
    finishedAt: null,
    deliveredAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function createMockWorkOrderRepository(): jest.Mocked<IWorkOrderRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByNumber: jest.fn(),
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    generateNextNumber: jest.fn(),
  };
}
