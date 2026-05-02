import { PrismaQuotePartSupplyRepository } from '@infrastructure/repositories/prisma-quote-part-supply.repository';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { randomUUID } from 'crypto';
import { Prisma } from '@generated/client';

describe('PrismaQuotePartSupplyRepository', () => {
  let repository: PrismaQuotePartSupplyRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaQuotePartSupplyRepository(prisma as any);
  });

  describe('create', () => {
    it('should create a quote part supply', async () => {
      const qps = QuotePartSupply.create({
        quoteId: randomUUID(),
        partSupplyId: randomUUID(),
        quantity: 2,
        unitPrice: 100.0,
      });

      prisma.quotePartSupply.create.mockResolvedValue({
        ...qps,
        unitPrice: new Prisma.Decimal(qps.unitPrice),
        totalPrice: new Prisma.Decimal(qps.totalPrice),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.create(qps);

      expect(result.quoteId).toBe(qps.quoteId);
      expect(prisma.quotePartSupply.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a quote part supply', async () => {
      const qps = QuotePartSupply.create({
        quoteId: randomUUID(),
        partSupplyId: randomUUID(),
        quantity: 2,
        unitPrice: 100.0,
      });
      qps.quantity = 3;

      prisma.quotePartSupply.update.mockResolvedValue({
        ...qps,
        unitPrice: new Prisma.Decimal(qps.unitPrice),
        totalPrice: new Prisma.Decimal(qps.totalPrice),
      });

      const result = await repository.update(qps);

      expect(result.quantity).toBe(3);
      expect(prisma.quotePartSupply.update).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return item when found', async () => {
      const quoteId = randomUUID();
      const partSupplyId = randomUUID();
      prisma.quotePartSupply.findUnique.mockResolvedValue({
        quoteId,
        partSupplyId,
        quantity: 1,
        unitPrice: new Prisma.Decimal(10),
        totalPrice: new Prisma.Decimal(10),
      });

      const result = await repository.findOne(quoteId, partSupplyId);

      expect(result).toBeDefined();
      expect(result?.quoteId).toBe(quoteId);
    });

    it('should return null when not found', async () => {
      prisma.quotePartSupply.findUnique.mockResolvedValue(null);
      const result = await repository.findOne(randomUUID(), randomUUID());
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete an item', async () => {
      const quoteId = randomUUID();
      const partSupplyId = randomUUID();
      prisma.quotePartSupply.delete.mockResolvedValue({ quoteId, partSupplyId });

      await repository.remove(quoteId, partSupplyId);

      expect(prisma.quotePartSupply.delete).toHaveBeenCalled();
    });
  });

  describe('findByQuoteId', () => {
    it('should return items for a quote', async () => {
      const quoteId = randomUUID();
      prisma.quotePartSupply.findMany.mockResolvedValue([
        {
          quoteId,
          partSupplyId: randomUUID(),
          quantity: 1,
          unitPrice: new Prisma.Decimal(10),
          totalPrice: new Prisma.Decimal(10),
        },
      ]);

      const result = await repository.findByQuoteId(quoteId);

      expect(result.length).toBe(1);
    });
  });
});
