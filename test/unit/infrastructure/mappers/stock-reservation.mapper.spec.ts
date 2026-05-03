import { StockReservationMapper } from '@infrastructure/mappers/stock-reservation.mapper';
import { randomUUID } from 'node:crypto';

describe('StockReservationMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        partSupplyId: randomUUID(),
        workOrderId: randomUUID(),
        quantity: 5,
        createdAt: now,
      };

      const domainEntity = StockReservationMapper.toDomain(prismaRecord);

      expect(domainEntity.id).toBe(prismaRecord.id);
      expect(domainEntity.partSupplyId).toBe(prismaRecord.partSupplyId);
      expect(domainEntity.workOrderId).toBe(prismaRecord.workOrderId);
      expect(domainEntity.quantity).toBe(5);
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
    });
  });
});
