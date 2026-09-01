import { randomUUID } from 'node:crypto';

import { StatusHistoryMapper } from '@infrastructure/persistence/prisma/mappers/status-history.mapper';

import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { UserRole } from '@domain/enums/user-role.enum';

describe('StatusHistoryMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        workOrderId: randomUUID(),
        changedById: randomUUID(),
        previousStatus: WorkOrderStatus.RECEIVED,
        newStatus: WorkOrderStatus.IN_DIAGNOSIS,
        notes: 'Status changed',
        createdAt: now,
      };

      const domainEntity = StatusHistoryMapper.toDomain(prismaRecord);

      expect(domainEntity.id).toBe(prismaRecord.id);
      expect(domainEntity.workOrderId).toBe(prismaRecord.workOrderId);
      expect(domainEntity.changedById).toBe(prismaRecord.changedById);
      expect(domainEntity.previousStatus).toBe(WorkOrderStatus.RECEIVED);
      expect(domainEntity.newStatus).toBe(WorkOrderStatus.IN_DIAGNOSIS);
      expect(domainEntity.notes).toBe(prismaRecord.notes);
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
    });

    it('should map a Prisma record with nulls to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        workOrderId: randomUUID(),
        changedById: null,
        previousStatus: null,
        newStatus: WorkOrderStatus.RECEIVED,
        notes: null,
        createdAt: now,
      };

      const domainEntity = StatusHistoryMapper.toDomain(prismaRecord);

      expect(domainEntity.changedById).toBeNull();
      expect(domainEntity.previousStatus).toBeNull();
      expect(domainEntity.notes).toBeNull();
    });

    it('should map changedBy relation to domain User entity', () => {
      const now = new Date();
      const userId = randomUUID();
      const prismaRecord = {
        id: randomUUID(),
        workOrderId: randomUUID(),
        changedById: userId,
        previousStatus: WorkOrderStatus.RECEIVED,
        newStatus: WorkOrderStatus.IN_DIAGNOSIS,
        notes: null,
        createdAt: now,
        changedBy: {
          id: userId,
          name: 'Tech User',
          email: 'tech@test.com',
          cpf: null,
          passwordHash: 'hash',
          role: UserRole.MECHANIC,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      };

      const domainEntity = StatusHistoryMapper.toDomain(prismaRecord);

      expect(domainEntity.changedBy).toBeDefined();
      expect(domainEntity.changedBy!.id).toBe(userId);
      expect(domainEntity.changedBy!.name).toBe('Tech User');
    });
  });
});
