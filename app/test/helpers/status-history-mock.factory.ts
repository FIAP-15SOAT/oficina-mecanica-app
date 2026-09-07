import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { IStatusHistoryRepository } from '@domain/interfaces/repositories/status-history.repository.interface';

export function createMockStatusHistory(overrides: Partial<StatusHistory> = {}): StatusHistory {
  return StatusHistory.reconstitute({
    id: overrides.id ?? '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    workOrderId: overrides.workOrderId ?? '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    changedById: overrides.changedById ?? null,
    previousStatus: overrides.previousStatus ?? null,
    newStatus: overrides.newStatus ?? WorkOrderStatus.RECEIVED,
    notes: overrides.notes ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
  });
}

export function arrangeStatusHistory(
  repository: IStatusHistoryRepository,
  previous: StatusHistory[],
  persistedAt: Date,
): void {
  const entries = [...previous];

  (repository.create as jest.Mock).mockImplementation((entry: StatusHistory) => {
    const persisted = createMockStatusHistory({ ...entry, createdAt: persistedAt });

    entries.push(persisted);

    return Promise.resolve(persisted);
  });
  (repository.findByWorkOrderId as jest.Mock).mockImplementation(() =>
    Promise.resolve([...entries]),
  );
}

export function createMockStatusHistoryRepository(
  existing: StatusHistory[] = [],
): jest.Mocked<IStatusHistoryRepository> {
  const entries = [...existing];

  return {
    create: jest.fn().mockImplementation((entry: StatusHistory) => {
      entries.push(entry);

      return Promise.resolve(entry);
    }),
    findByWorkOrderId: jest.fn().mockImplementation(() => Promise.resolve([...entries])),
  };
}
