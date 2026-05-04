import { UpdateQuotePartSupplyQuantityUseCase } from '@application/use-cases/quote/update-quote-part-supply-quantity.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { createMockQuote, createMockQuotePartSupply } from '../../../../helpers/quote-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';

describe('UpdateQuotePartSupplyQuantityUseCase', () => {
  let useCase: UpdateQuotePartSupplyQuantityUseCase;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUow = unitOfWork;
    useCase = new UpdateQuotePartSupplyQuantityUseCase(mockUow);
  });

  it('should update a part supply item and recalculate totals', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const existing = createMockQuotePartSupply({
      quoteId: quote.id,
      quantity: 1,
      unitPrice: 80,
      totalPrice: 80,
    });
    const updatedPart = createMockQuotePartSupply({
      ...existing,
      quantity: 3,
      unitPrice: 80,
      totalPrice: 240,
    });
    const updatedQuote = createMockQuote({ ...quote, partsAmount: 240, totalAmount: 240 });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.quotePartSupply.findOne as jest.Mock).mockResolvedValue(existing);
    (mockRepos.quotePartSupply.update as jest.Mock).mockResolvedValue(updatedPart);
    (mockRepos.quoteService.findByQuoteId as jest.Mock).mockResolvedValue([]);
    (mockRepos.quotePartSupply.findByQuoteId as jest.Mock).mockResolvedValue([updatedPart]);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(updatedQuote);

    const result = await useCase.execute({
      quoteId: quote.id,
      partSupplyId: existing.partSupplyId,
      quantity: 3,
    });

    expect(mockRepos.quotePartSupply.update).toHaveBeenCalledTimes(1);
    expect(mockRepos.quote.update).toHaveBeenCalledTimes(1);
    expect(result.partsAmount).toBe(240);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', partSupplyId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not editable', async () => {
    const quote = createMockQuote({ status: QuoteStatus.APPROVED });
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: 'any', quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceNotFoundException when part supply item not found in quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.quotePartSupply.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: 'bad', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
