import { WorkOrderPartSupplyMapper } from '@infrastructure/mappers/work-order-part-supply.mapper';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/client';

describe('WorkOrderPartSupplyMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        workOrderId: randomUUID(),
        partSupplyId: randomUUID(),
        quantity: 3,
        unitPrice: new Prisma.Decimal(10.5),
        totalPrice: new Prisma.Decimal(31.5),
        createdAt: now,
        updatedAt: now,
      };

      const domainEntity = WorkOrderPartSupplyMapper.toDomain(prismaRecord);

      expect(domainEntity.workOrderId).toBe(prismaRecord.workOrderId);
      expect(domainEntity.partSupplyId).toBe(prismaRecord.partSupplyId);
      expect(domainEntity.quantity).toBe(prismaRecord.quantity);
      expect(domainEntity.unitPrice).toBe(10.5);
      expect(domainEntity.totalPrice).toBe(31.5);
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
      expect(domainEntity.updatedAt).toBe(prismaRecord.updatedAt);
    });
  });
});
