import { QuoteMapper } from '@infrastructure/mappers/quote.mapper';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { randomUUID } from 'crypto';
import { Prisma } from '@generated/client';

describe('QuoteMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        workOrderId: randomUUID(),
        servicesAmount: new Prisma.Decimal(150.0),
        partsAmount: new Prisma.Decimal(50.0),
        totalAmount: new Prisma.Decimal(200.0),
        status: QuoteStatus.PENDING,
        notes: 'Some notes',
        sentAt: now,
        approvedAt: null,
        rejectedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      const domainEntity = QuoteMapper.toDomain(prismaRecord);

      expect(domainEntity.id).toBe(prismaRecord.id);
      expect(domainEntity.workOrderId).toBe(prismaRecord.workOrderId);
      expect(domainEntity.servicesAmount).toBe(150.0);
      expect(domainEntity.partsAmount).toBe(50.0);
      expect(domainEntity.totalAmount).toBe(200.0);
      expect(domainEntity.status).toBe(QuoteStatus.PENDING);
      expect(domainEntity.notes).toBe(prismaRecord.notes);
      expect(domainEntity.sentAt).toBe(prismaRecord.sentAt);
      expect(domainEntity.approvedAt).toBeNull();
      expect(domainEntity.rejectedAt).toBeNull();
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
      expect(domainEntity.updatedAt).toBe(prismaRecord.updatedAt);
    });
  });
});
