import { StockMovementMapper } from '@infrastructure/mappers/stock-movement.mapper';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { randomUUID } from 'crypto';

describe('StockMovementMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        partSupplyId: randomUUID(),
        workOrderId: randomUUID(),
        type: StockMovementType.ENTRY,
        quantity: 10,
        reason: 'Restock',
        createdAt: now,
      };

      const domainEntity = StockMovementMapper.toDomain(prismaRecord);

      expect(domainEntity.id).toBe(prismaRecord.id);
      expect(domainEntity.partSupplyId).toBe(prismaRecord.partSupplyId);
      expect(domainEntity.workOrderId).toBe(prismaRecord.workOrderId);
      expect(domainEntity.type).toBe(StockMovementType.ENTRY);
      expect(domainEntity.quantity).toBe(10);
      expect(domainEntity.reason).toBe('Restock');
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
    });

    it('should map a Prisma record with nulls to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        partSupplyId: randomUUID(),
        workOrderId: null,
        type: StockMovementType.EXIT,
        quantity: 5,
        reason: null,
        createdAt: now,
      };

      const domainEntity = StockMovementMapper.toDomain(prismaRecord);

      expect(domainEntity.workOrderId).toBeNull();
      expect(domainEntity.reason).toBeNull();
    });
  });
});
