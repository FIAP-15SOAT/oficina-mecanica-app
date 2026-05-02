import { RemoveQuoteServiceUseCase } from '@application/use-cases/quote/remove-quote-service.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import {
  createMockQuote,
  createMockQuoteRepository,
  createMockQuoteServiceRepository,
  createMockQuotePartSupplyRepository,
} from '../../../../helpers/quote-mock.factory';

describe('RemoveQuoteServiceUseCase', () => {
  let useCase: RemoveQuoteServiceUseCase;
  let mockRepos: ReturnType<typeof buildMockRepos>;
  let mockUow: { executeTransaction: jest.Mock };

  function buildMockRepos() {
    return {
      quote: createMockQuoteRepository(),
      quoteService: createMockQuoteServiceRepository(),
      quotePartSupply: createMockQuotePartSupplyRepository(),
    };
  }

  beforeEach(() => {
    mockRepos = buildMockRepos();
    mockUow = {
      executeTransaction: jest.fn().mockImplementation(async (work: any) => work(mockRepos)),
    };
    useCase = new RemoveQuoteServiceUseCase(mockUow as any);
  });

  it('should remove a service and recalculate totals', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING, servicesAmount: 100, totalAmount: 100 });
    const updatedQuote = createMockQuote({ ...quote, servicesAmount: 0, totalAmount: 0 });

    mockRepos.quote.findById.mockResolvedValue(quote);
    mockRepos.quoteService.findOne.mockResolvedValue({ id: 'svc-id' } as any);
    mockRepos.quoteService.remove.mockResolvedValue(undefined);
    mockRepos.quoteService.findByQuoteId.mockResolvedValue([]);
    mockRepos.quotePartSupply.findByQuoteId.mockResolvedValue([]);
    mockRepos.quote.update.mockResolvedValue(updatedQuote);

    const result = await useCase.execute(quote.id, 'svc-id');

    expect(mockRepos.quoteService.remove).toHaveBeenCalledWith(quote.id, 'svc-id');
    expect(mockRepos.quote.update).toHaveBeenCalledTimes(1);
    expect(result.servicesAmount).toBe(0);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    mockRepos.quote.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('bad', 'svc'),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    mockRepos.quote.findById.mockResolvedValue(quote);

    await expect(
      useCase.execute(quote.id, 'svc'),
    ).rejects.toThrow(BusinessRuleViolationException);

    expect(mockRepos.quoteService.remove).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when service is not associated with the quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    mockRepos.quote.findById.mockResolvedValue(quote);
    mockRepos.quoteService.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(quote.id, 'nonexistent-service'),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(mockRepos.quoteService.remove).not.toHaveBeenCalled();
  });
});
