import { QuotePartSupplyMapper } from '@infrastructure/mappers/quote-part-supply.mapper';
import { randomUUID } from 'node:crypto';
import { Prisma, PartSupplyCategory, Unit } from '@generated/client';

describe('QuotePartSupplyMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        quoteId: randomUUID(),
        partSupplyId: randomUUID(),
        quantity: 2,
        unitPrice: new Prisma.Decimal(50.0),
        totalPrice: new Prisma.Decimal(100.0),
        createdAt: now,
        updatedAt: now,
      };

      const domainEntity = QuotePartSupplyMapper.toDomain(prismaRecord);

      expect(domainEntity.quoteId).toBe(prismaRecord.quoteId);
      expect(domainEntity.partSupplyId).toBe(prismaRecord.partSupplyId);
      expect(domainEntity.quantity).toBe(prismaRecord.quantity);
      expect(domainEntity.unitPrice).toBe(50.0);
      expect(domainEntity.totalPrice).toBe(100.0);
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
      expect(domainEntity.updatedAt).toBe(prismaRecord.updatedAt);
    });

    it('should enrich entity with partSupply relation when present', () => {
      const now = new Date();
      const partSupplyId = randomUUID();
      const prismaRecord = {
        quoteId: randomUUID(),
        partSupplyId,
        quantity: 1,
        unitPrice: new Prisma.Decimal(45.0),
        totalPrice: new Prisma.Decimal(45.0),
        createdAt: now,
        updatedAt: now,
        partSupply: {
          id: partSupplyId,
          name: 'Filtro de Óleo',
          description: null,
          sku: 'FO-001',
          partNumber: null,
          category: PartSupplyCategory.PART,
          unit: Unit.UN,
          costPrice: new Prisma.Decimal(25.0),
          salePrice: new Prisma.Decimal(45.0),
          stock: 50,
          minStock: 5,
          reservedStock: 0,
          version: 0,
          expiresAt: null,
          createdAt: now,
          updatedAt: now,
        },
      };

      const domainEntity = QuotePartSupplyMapper.toDomain(prismaRecord);

      expect(domainEntity.partSupply).toBeDefined();
      expect(domainEntity.partSupply!.name).toBe('Filtro de Óleo');
      expect(domainEntity.partSupply!.sku).toBe('FO-001');
    });
  });
});
