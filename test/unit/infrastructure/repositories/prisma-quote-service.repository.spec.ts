import { PrismaQuoteServiceRepository } from '@infrastructure/repositories/prisma-quote-service.repository';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { randomUUID } from 'crypto';
import { Prisma } from '@generated/client';

describe('PrismaQuoteServiceRepository', () => {
  let repository: PrismaQuoteServiceRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaQuoteServiceRepository(prisma as any);
  });

  describe('create', () => {
    it('should create a quote service', async () => {
      const qs = QuoteService.create({
        quoteId: randomUUID(),
        serviceId: randomUUID(),
        quantity: 2,
        unitPrice: 100.0,
      });

      prisma.quoteService.create.mockResolvedValue({
        ...qs,
        unitPrice: new Prisma.Decimal(qs.unitPrice),
        totalPrice: new Prisma.Decimal(qs.totalPrice),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.create(qs);

      expect(result.quoteId).toBe(qs.quoteId);
      expect(prisma.quoteService.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a quote service', async () => {
      const qs = QuoteService.create({
        quoteId: randomUUID(),
        serviceId: randomUUID(),
        quantity: 2,
        unitPrice: 100.0,
      });
      qs.quantity = 3;

      prisma.quoteService.update.mockResolvedValue({
        ...qs,
        unitPrice: new Prisma.Decimal(qs.unitPrice),
        totalPrice: new Prisma.Decimal(qs.totalPrice),
      });

      const result = await repository.update(qs);

      expect(result.quantity).toBe(3);
      expect(prisma.quoteService.update).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return item when found', async () => {
      const quoteId = randomUUID();
      const serviceId = randomUUID();
      prisma.quoteService.findUnique.mockResolvedValue({
        quoteId,
        serviceId,
        quantity: 1,
        unitPrice: new Prisma.Decimal(10),
        totalPrice: new Prisma.Decimal(10),
      });

      const result = await repository.findOne(quoteId, serviceId);

      expect(result).toBeDefined();
      expect(result?.quoteId).toBe(quoteId);
    });

    it('should return null when not found', async () => {
      prisma.quoteService.findUnique.mockResolvedValue(null);
      const result = await repository.findOne(randomUUID(), randomUUID());
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete an item', async () => {
      const quoteId = randomUUID();
      const serviceId = randomUUID();
      prisma.quoteService.delete.mockResolvedValue({ quoteId, serviceId });

      await repository.remove(quoteId, serviceId);

      expect(prisma.quoteService.delete).toHaveBeenCalled();
    });
  });

  describe('findByQuoteId', () => {
    it('should return items for a quote', async () => {
      const quoteId = randomUUID();
      prisma.quoteService.findMany.mockResolvedValue([
        {
          quoteId,
          serviceId: randomUUID(),
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
