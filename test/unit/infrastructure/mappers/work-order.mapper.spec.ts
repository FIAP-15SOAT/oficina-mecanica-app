import { WorkOrderMapper } from '@infrastructure/mappers/work-order.mapper';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/client';

describe('WorkOrderMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: randomUUID(),
        status: WorkOrderStatus.IN_DIAGNOSIS,
        problemDescription: 'Engine noise',
        internalNotes: 'Check timing belt',
        mileageAtService: 50000,
        totalAmount: new Prisma.Decimal(250.0),
        approvedAt: now,
        rejectedAt: null,
        startedAt: now,
        finishedAt: null,
        deliveredAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const domainEntity = WorkOrderMapper.toDomain(prismaRecord);

      expect(domainEntity.id).toBe(prismaRecord.id);
      expect(domainEntity.number).toBe(prismaRecord.number);
      expect(domainEntity.customerId).toBe(prismaRecord.customerId);
      expect(domainEntity.vehicleId).toBe(prismaRecord.vehicleId);
      expect(domainEntity.assignedUserId).toBe(prismaRecord.assignedUserId);
      expect(domainEntity.status).toBe(WorkOrderStatus.IN_DIAGNOSIS);
      expect(domainEntity.problemDescription).toBe(prismaRecord.problemDescription);
      expect(domainEntity.internalNotes).toBe(prismaRecord.internalNotes);
      expect(domainEntity.mileageAtService).toBe(prismaRecord.mileageAtService);
      expect(domainEntity.totalAmount).toBe(250.0);
      expect(domainEntity.approvedAt).toBe(prismaRecord.approvedAt);
      expect(domainEntity.rejectedAt).toBeNull();
      expect(domainEntity.startedAt).toBe(prismaRecord.startedAt);
      expect(domainEntity.finishedAt).toBeNull();
      expect(domainEntity.deliveredAt).toBeNull();
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
      expect(domainEntity.updatedAt).toBe(prismaRecord.updatedAt);
    });

    it('should map a Prisma record with nulls to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.RECEIVED,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: new Prisma.Decimal(0.0),
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const domainEntity = WorkOrderMapper.toDomain(prismaRecord);

      expect(domainEntity.assignedUserId).toBeNull();
      expect(domainEntity.problemDescription).toBeNull();
      expect(domainEntity.internalNotes).toBeNull();
      expect(domainEntity.mileageAtService).toBeNull();
      expect(domainEntity.totalAmount).toBe(0);
      expect(domainEntity.approvedAt).toBeNull();
      expect(domainEntity.startedAt).toBeNull();
    });
  });
});
