import { RemoveQuotePartSupplyUseCase } from '@application/use-cases/quote/remove-quote-part-supply.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import {
  createMockQuote,
  createMockQuotePartSupply,
  createMockQuoteService,
} from '../../../../helpers/quote-mock.factory';

function buildMockRepos() {
  return {
    quote: { findById: jest.fn(), update: jest.fn() },
    quotePartSupply: { findOne: jest.fn(), remove: jest.fn(), findByQuoteId: jest.fn() },
    quoteService: { findByQuoteId: jest.fn() },
  };
}

describe('RemoveQuotePartSupplyUseCase', () => {
  let useCase: RemoveQuotePartSupplyUseCase;
  let mockRepos: ReturnType<typeof buildMockRepos>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    mockRepos = buildMockRepos();
    mockUow = {
      executeTransaction: jest
        .fn()
        .mockImplementation((work: (repos: ReturnType<typeof buildMockRepos>) => unknown) =>
          work(mockRepos),
        ),
    };
    useCase = new RemoveQuotePartSupplyUseCase(mockUow);
  });

  it('should remove part supply from quote and recalculate totals', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const partSupply = createMockQuotePartSupply({ quoteId: quote.id });
    const service = createMockQuoteService({ quoteId: quote.id });

    mockRepos.quote.findById.mockResolvedValue(quote);
    mockRepos.quotePartSupply.findOne.mockResolvedValue({
      id: partSupply.partSupplyId,
    });
    mockRepos.quotePartSupply.remove.mockResolvedValue(undefined);
    mockRepos.quoteService.findByQuoteId.mockResolvedValue([service]);
    mockRepos.quotePartSupply.findByQuoteId.mockResolvedValue([]);
    mockRepos.quote.update.mockResolvedValue(quote);

    await useCase.execute(quote.id, partSupply.partSupplyId);

    expect(mockRepos.quotePartSupply.remove).toHaveBeenCalledWith(
      quote.id,
      partSupply.partSupplyId,
    );
    expect(mockRepos.quote.update).toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    mockRepos.quote.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id', 'part-id')).rejects.toThrow(
      ResourceNotFoundException,
    );
    expect(mockRepos.quotePartSupply.remove).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    mockRepos.quote.findById.mockResolvedValue(quote);

    await expect(useCase.execute(quote.id, 'part-id')).rejects.toThrow(
      BusinessRuleViolationException,
    );
    expect(mockRepos.quotePartSupply.remove).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when part/supply is not associated with the quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    mockRepos.quote.findById.mockResolvedValue(quote);
    mockRepos.quotePartSupply.findOne.mockResolvedValue(null);

    await expect(useCase.execute(quote.id, 'nonexistent-part')).rejects.toThrow(
      ResourceNotFoundException,
    );

    expect(mockRepos.quotePartSupply.remove).not.toHaveBeenCalled();
  });
});
