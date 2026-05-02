import { PrismaQuoteRepository } from '@infrastructure/repositories/prisma-quote.repository';
import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { randomUUID } from 'crypto';
import { Prisma } from '@generated/client';

describe('PrismaQuoteRepository', () => {
  let repository: PrismaQuoteRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaQuoteRepository(prisma as any);
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
    it('should update a quote', async () => {
      const id = randomUUID();
      const quote = Quote.create({ workOrderId: randomUUID() });
      quote.id = id;
      quote.status = QuoteStatus.SENT;

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
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
      });

      const result = await repository.update(quote);

      expect(result.status).toBe(QuoteStatus.SENT);
      expect(prisma.quote.update).toHaveBeenCalled();
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
