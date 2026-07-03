import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/client';

import { QuoteServiceMapper } from '@infrastructure/persistence/prisma/mappers/quote-service.mapper';

describe('QuoteServiceMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        quoteId: randomUUID(),
        serviceId: randomUUID(),
        quantity: 1,
        unitPrice: new Prisma.Decimal(150.0),
        totalPrice: new Prisma.Decimal(150.0),
        createdAt: now,
        updatedAt: now,
      };

      const domainEntity = QuoteServiceMapper.toDomain(prismaRecord);

      expect(domainEntity.quoteId).toBe(prismaRecord.quoteId);
      expect(domainEntity.serviceId).toBe(prismaRecord.serviceId);
      expect(domainEntity.quantity).toBe(prismaRecord.quantity);
      expect(domainEntity.unitPrice).toBe(150.0);
      expect(domainEntity.totalPrice).toBe(150.0);
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
      expect(domainEntity.updatedAt).toBe(prismaRecord.updatedAt);
    });

    it('should enrich entity with service relation when present', () => {
      const now = new Date();
      const serviceId = randomUUID();
      const prismaRecord = {
        quoteId: randomUUID(),
        serviceId,
        quantity: 2,
        unitPrice: new Prisma.Decimal(150.0),
        totalPrice: new Prisma.Decimal(300.0),
        createdAt: now,
        updatedAt: now,
        service: {
          id: serviceId,
          name: 'Troca de óleo',
          description: 'Troca de óleo com filtro',
          basePrice: new Prisma.Decimal(150.0),
          estimatedTimeMin: 30,
          createdAt: now,
          updatedAt: now,
        },
      };

      const domainEntity = QuoteServiceMapper.toDomain(prismaRecord);

      expect(domainEntity.service).toBeDefined();
      expect(domainEntity.service!.name).toBe('Troca de óleo');
    });
  });
});
