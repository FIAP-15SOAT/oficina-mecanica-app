import { PrismaQuoteRepository } from '@infrastructure/repositories/prisma-quote.repository';
import { Quote } from '@domain/entities/quote.entity';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/client';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';

describe('PrismaQuoteRepository', () => {
  let repository: PrismaQuoteRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaQuoteRepository(prisma);
  });

  describe('create', () => {
    it('should create a quote', async () => {
      const quote = Quote.create({
        workOrderId: randomUUID(),
        notes: 'Test notes',
      });

      prisma.quote.create.mockResolvedValue({
        id: quote.id,
        workOrderId: quote.workOrderId,
        servicesAmount: new Prisma.Decimal(quote.servicesAmount),
        partsAmount: new Prisma.Decimal(quote.partsAmount),
        totalAmount: new Prisma.Decimal(quote.totalAmount),
        status: quote.status,
        notes: quote.notes,
        sentAt: quote.sentAt,
        approvedAt: quote.approvedAt,
        rejectedAt: quote.rejectedAt,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
      });

      const result = await repository.create(quote);

      expect(result.id).toBe(quote.id);
      expect(prisma.quote.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a quote when found', async () => {
      const id = randomUUID();
      prisma.quote.findUnique.mockResolvedValue({
        id,
        status: QuoteStatus.PENDING,
        servicesAmount: new Prisma.Decimal(0),
        partsAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(0),
      });

      const result = await repository.findById(id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
    });

    it('should return null when not found', async () => {
      prisma.quote.findUnique.mockResolvedValue(null);

      const result = await repository.findById(randomUUID());

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a quote using optimistic locking', async () => {
      const id = randomUUID();

      const quote = Quote.reconstitute({
        id,
        workOrderId: randomUUID(),
        servicesAmount: 0,
        partsAmount: 0,
        totalAmount: 0,
        status: QuoteStatus.SENT,
        notes: null,
        sentAt: null,
        approvedAt: null,
        rejectedAt: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.quote.update.mockResolvedValue({
        id: quote.id,
        workOrderId: quote.workOrderId,
        servicesAmount: new Prisma.Decimal(quote.servicesAmount),
        partsAmount: new Prisma.Decimal(quote.partsAmount),
        totalAmount: new Prisma.Decimal(quote.totalAmount),
        status: quote.status,
        notes: quote.notes,
        sentAt: quote.sentAt,
        approvedAt: quote.approvedAt,
        rejectedAt: quote.rejectedAt,
        version: 2,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
      });

      const result = await repository.update(quote);

      expect(result.status).toBe(QuoteStatus.SENT);
      expect(prisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: quote.id, version: 1 } }),
      );
    });

    it('should throw ConcurrencyException when quote was modified concurrently', async () => {
      const quote = Quote.reconstitute({
        id: randomUUID(),
        workOrderId: randomUUID(),
        servicesAmount: 0,
        partsAmount: 0,
        totalAmount: 0,
        status: QuoteStatus.PENDING,
        notes: null,
        sentAt: null,
        approvedAt: null,
        rejectedAt: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.quote.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.0.0',
        }),
      );

      await expect(repository.update(quote)).rejects.toThrow(ConcurrencyException);
    });

    it('should rethrow unexpected errors from update', async () => {
      const quote = Quote.reconstitute({
        id: randomUUID(),
        workOrderId: randomUUID(),
        servicesAmount: 0,
        partsAmount: 0,
        totalAmount: 0,
        status: QuoteStatus.PENDING,
        notes: null,
        sentAt: null,
        approvedAt: null,
        rejectedAt: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.quote.update.mockRejectedValue(new Error('Database connection lost'));

      await expect(repository.update(quote)).rejects.toThrow('Database connection lost');
    });
  });

  describe('findByWorkOrderId', () => {
    it('should return quotes for a work order', async () => {
      prisma.quote.findMany.mockResolvedValue([
        {
          id: randomUUID(),
          status: QuoteStatus.PENDING,
          servicesAmount: new Prisma.Decimal(0),
          partsAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(0),
        },
      ]);

      const result = await repository.findByWorkOrderId(randomUUID());

      expect(result.length).toBe(1);
    });
  });

  describe('rejectPendingByWorkOrderId', () => {
    it('should update pending quotes to rejected', async () => {
      prisma.quote.updateMany.mockResolvedValue({ count: 1 });

      await repository.rejectPendingByWorkOrderId(randomUUID());

      expect(prisma.quote.updateMany).toHaveBeenCalled();
    });
  });

  describe('addServiceItem', () => {
    it('should create a quoteService record and update quote totals', async () => {
      const quote = Quote.reconstitute({
        id: randomUUID(),
        workOrderId: randomUUID(),
        servicesAmount: 100,
        partsAmount: 0,
        totalAmount: 100,
        status: QuoteStatus.PENDING,
        notes: null,
        sentAt: null,
        approvedAt: null,
        rejectedAt: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.quoteService.create.mockResolvedValue({});
      prisma.quote.update.mockResolvedValue({});

      const item = QuoteService.reconstitute({
        quoteId: quote.id,
        serviceId: randomUUID(),
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await repository.addServiceItem(quote, item);

      expect(prisma.quoteService.create).toHaveBeenCalled();
      expect(prisma.quote.update).toHaveBeenCalled();
    });
  });

  describe('removeServiceItem', () => {
    it('should delete the quoteService record and update quote totals', async () => {
      const quote = Quote.reconstitute({
        id: randomUUID(),
        workOrderId: randomUUID(),
        servicesAmount: 0,
        partsAmount: 0,
        totalAmount: 0,
        status: QuoteStatus.PENDING,
        notes: null,
        sentAt: null,
        approvedAt: null,
        rejectedAt: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const serviceId = randomUUID();
      prisma.quoteService.delete.mockResolvedValue({});
      prisma.quote.update.mockResolvedValue({});

      await repository.removeServiceItem(quote, serviceId);

      expect(prisma.quoteService.delete).toHaveBeenCalled();
      expect(prisma.quote.update).toHaveBeenCalled();
    });
  });

  describe('updateServiceItemQuantity', () => {
    it('should update the quoteService record and update quote totals', async () => {
      const quote = Quote.reconstitute({
        id: randomUUID(),
        workOrderId: randomUUID(),
        servicesAmount: 200,
        partsAmount: 0,
        totalAmount: 200,
        status: QuoteStatus.PENDING,
        notes: null,
        sentAt: null,
        approvedAt: null,
        rejectedAt: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.quoteService.update.mockResolvedValue({});
      prisma.quote.update.mockResolvedValue({});

      const item = QuoteService.reconstitute({
        quoteId: quote.id,
        serviceId: randomUUID(),
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await repository.updateServiceItemQuantity(quote, item);

      expect(prisma.quoteService.update).toHaveBeenCalled();
      expect(prisma.quote.update).toHaveBeenCalled();
    });
  });

  describe('addPartSupplyItem', () => {
    it('should create a quotePartSupply record and update quote totals', async () => {
      const quote = Quote.reconstitute({
        id: randomUUID(),
        workOrderId: randomUUID(),
        servicesAmount: 0,
        partsAmount: 80,
        totalAmount: 80,
        status: QuoteStatus.PENDING,
        notes: null,
        sentAt: null,
        approvedAt: null,
        rejectedAt: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.quotePartSupply.create.mockResolvedValue({});
      prisma.quote.update.mockResolvedValue({});

      const item = QuotePartSupply.reconstitute({
        quoteId: quote.id,
        partSupplyId: randomUUID(),
        quantity: 2,
        unitPrice: 40,
        totalPrice: 80,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await repository.addPartSupplyItem(quote, item);

      expect(prisma.quotePartSupply.create).toHaveBeenCalled();
      expect(prisma.quote.update).toHaveBeenCalled();
    });
  });

  describe('removePartSupplyItem', () => {
    it('should delete the quotePartSupply record and update quote totals', async () => {
      const quote = Quote.reconstitute({
        id: randomUUID(),
        workOrderId: randomUUID(),
        servicesAmount: 0,
        partsAmount: 0,
        totalAmount: 0,
        status: QuoteStatus.PENDING,
        notes: null,
        sentAt: null,
        approvedAt: null,
        rejectedAt: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const partSupplyId = randomUUID();
      prisma.quotePartSupply.delete.mockResolvedValue({});
      prisma.quote.update.mockResolvedValue({});

      await repository.removePartSupplyItem(quote, partSupplyId);

      expect(prisma.quotePartSupply.delete).toHaveBeenCalled();
      expect(prisma.quote.update).toHaveBeenCalled();
    });
  });

  describe('updatePartSupplyItemQuantity', () => {
    it('should update the quotePartSupply record and update quote totals', async () => {
      const quote = Quote.reconstitute({
        id: randomUUID(),
        workOrderId: randomUUID(),
        servicesAmount: 0,
        partsAmount: 160,
        totalAmount: 160,
        status: QuoteStatus.PENDING,
        notes: null,
        sentAt: null,
        approvedAt: null,
        rejectedAt: null,
        version: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.quotePartSupply.update.mockResolvedValue({});
      prisma.quote.update.mockResolvedValue({});

      const item = QuotePartSupply.reconstitute({
        quoteId: quote.id,
        partSupplyId: randomUUID(),
        quantity: 4,
        unitPrice: 40,
        totalPrice: 160,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await repository.updatePartSupplyItemQuantity(quote, item);

      expect(prisma.quotePartSupply.update).toHaveBeenCalled();
      expect(prisma.quote.update).toHaveBeenCalled();
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated quotes', async () => {
      prisma.quote.findMany.mockResolvedValue([
        {
          id: randomUUID(),
          status: QuoteStatus.PENDING,
          servicesAmount: new Prisma.Decimal(0),
          partsAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(0),
        },
      ]);
      prisma.quote.count.mockResolvedValue(1);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

      expect(result.total).toBe(1);
      expect(result.items.length).toBe(1);
    });

    it('should apply filters correctly', async () => {
      prisma.quote.findMany.mockResolvedValue([]);
      prisma.quote.count.mockResolvedValue(0);

      const workOrderId = randomUUID();
      await repository.findAllPaginated(
        { page: 1, limit: 10 },
        { workOrderId, status: QuoteStatus.SENT },
      );

      expect(prisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workOrderId,
            status: QuoteStatus.SENT,
          },
        }),
      );
    });
  });
});
