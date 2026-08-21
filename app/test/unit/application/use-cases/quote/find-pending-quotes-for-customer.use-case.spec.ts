import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { createMockQuote, createMockQuoteRepository } from '../../../../helpers/quote-mock.factory';
import { FindPendingQuotesForCustomerUseCase } from '@application/use-cases/quote/find-pending-quotes-for-customer.use-case';

describe('FindPendingQuotesForCustomerUseCase', () => {
  let useCase: FindPendingQuotesForCustomerUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    useCase = new FindPendingQuotesForCustomerUseCase(quoteRepository);
  });

  it('should list only SENT quotes filtered by the given customer', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    quoteRepository.findAllPaginated.mockResolvedValue({ items: [quote], total: 1 });

    const result = await useCase.execute('customer-uuid-123', { page: 1, limit: 10 });

    expect(quoteRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { customerId: 'customer-uuid-123', status: QuoteStatus.SENT },
    );
    expect(result.items).toEqual([quote]);
    expect(result.pagination).toEqual({
      totalRecords: 1,
      totalPages: 1,
      page: 1,
      limit: 10,
    });
  });
});
