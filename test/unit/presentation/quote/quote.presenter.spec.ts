import { randomUUID } from 'node:crypto';
import { Quote } from '@domain/entities/quote.entity';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuotePresenter } from '@presentation/quote/quote.presenter';

describe('QuotePresenter', () => {
  const quoteProps = {
    id: randomUUID(),
    workOrderId: randomUUID(),
    servicesAmount: 150,
    partsAmount: 50,
    totalAmount: 200,
    version: 0,
    status: QuoteStatus.PENDING,
    notes: 'test notes',
    sentAt: new Date(),
    approvedAt: null,
    rejectedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const quote = Quote.reconstitute(quoteProps);

  describe('toResponse', () => {
    it('should format a quote correctly', () => {
      const response = QuotePresenter.toResponse(quote);
      expect(response.id).toBe(quote.id);
      expect(response.totalAmount).toBe(200);
    });
  });

  describe('toDataResponse', () => {
    it('should wrap response in data property', () => {
      const response = QuotePresenter.toDataResponse(quote);
      expect(response.data.id).toBe(quote.id);
    });
  });

  describe('toWithItemsResponse', () => {
    it('should include services and parts', () => {
      const quoteWithItems = Quote.reconstitute({
        ...quoteProps,
        services: [{ id: 's1' }] as unknown as QuoteService[],
        partsSupplies: [{ id: 'p1' }] as unknown as QuotePartSupply[],
      });
      const response = QuotePresenter.toWithItemsResponse(quoteWithItems);
      expect(response.data.services).toHaveLength(1);
      expect(response.data.partsSupplies).toHaveLength(1);
    });

    it('should return empty arrays if items are missing', () => {
      const response = QuotePresenter.toWithItemsResponse(quote);
      expect(response.data.services).toEqual([]);
      expect(response.data.partsSupplies).toEqual([]);
    });
  });

  describe('toPaginatedResponse', () => {
    it('should format paginated result correctly', () => {
      const paginatedResult = {
        items: [quote],
        pagination: {
          totalRecords: 1,
          totalPages: 1,
          page: 1,
          limit: 10,
        },
      };

      const response = QuotePresenter.toPaginatedResponse(paginatedResult);

      expect(response.data).toHaveLength(1);
      expect(response.data[0].id).toBe(quote.id);
      expect(response.pagination).toEqual(paginatedResult.pagination);
    });
  });
});
