import { randomUUID } from 'crypto';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { IStockMovementRepository } from '@domain/interfaces/repositories/stock-movement.repository.interface';

export function createMockStockMovement(overrides: Partial<StockMovement> = {}): StockMovement {
  const now = new Date();
  return new StockMovement({
    id: randomUUID(),
    partSupplyId: randomUUID(),
    workOrderId: randomUUID(),
    type: StockMovementType.EXIT,
    quantity: 1,
    reason: null,
    createdAt: now,
    ...overrides,
  });
}

export function createMockStockMovementRepository(): jest.Mocked<IStockMovementRepository> {
  return {
    create: jest.fn(),
    findByPartId: jest.fn(),
    findByWorkOrderId: jest.fn(),
    findAllPaginated: jest.fn(),
  };
}
