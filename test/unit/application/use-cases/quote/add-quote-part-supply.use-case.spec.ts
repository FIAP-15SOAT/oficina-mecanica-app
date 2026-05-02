import { AddQuotePartSupplyUseCase } from '@application/use-cases/quote/add-quote-part-supply.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import {
  createMockQuote,
  createMockQuotePartSupply,
  createMockQuoteRepository,
  createMockQuoteServiceRepository,
  createMockQuotePartSupplyRepository,
} from '../../../../helpers/quote-mock.factory';
import { createMockPartSupplyRepository, createMockPartSupply } from '../../../../helpers/part-supply-mock.factory';

describe('AddQuotePartSupplyUseCase', () => {
  let useCase: AddQuotePartSupplyUseCase;
  let mockRepos: ReturnType<typeof buildMockRepos>;
  let mockUow: { executeTransaction: jest.Mock };

  function buildMockRepos() {
    return {
      quote: createMockQuoteRepository(),
      quoteService: createMockQuoteServiceRepository(),
      quotePartSupply: createMockQuotePartSupplyRepository(),
      partSupply: createMockPartSupplyRepository(),
    };
  }

  beforeEach(() => {
    mockRepos = buildMockRepos();
    mockUow = {
      executeTransaction: jest.fn().mockImplementation(async (work: any) => work(mockRepos)),
    };
    useCase = new AddQuotePartSupplyUseCase(mockUow as any);
  });

  it('should add a part supply and recalculate totals', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const partSupply = createMockPartSupply({ salePrice: 80 });
    const qp = createMockQuotePartSupply({ quoteId: quote.id, partSupplyId: partSupply.id, totalPrice: 160 });
    const updatedQuote = createMockQuote({ ...quote, partsAmount: 160, totalAmount: 160 });

    mockRepos.quote.findById.mockResolvedValue(quote);
    mockRepos.partSupply.findById.mockResolvedValue(partSupply);
    mockRepos.quotePartSupply.findOne.mockResolvedValue(null);
    mockRepos.quotePartSupply.create.mockResolvedValue(qp);
    mockRepos.quoteService.findByQuoteId.mockResolvedValue([]);
    mockRepos.quotePartSupply.findByQuoteId.mockResolvedValue([qp]);
    mockRepos.quote.update.mockResolvedValue(updatedQuote);

    const result = await useCase.execute({
      quoteId: quote.id,
      partSupplyId: partSupply.id,
      quantity: 2,
    });

    expect(result.partsAmount).toBe(160);
    expect(mockRepos.quotePartSupply.create).toHaveBeenCalledTimes(1);
    expect(mockRepos.quote.update).toHaveBeenCalledTimes(1);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    mockRepos.quote.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', partSupplyId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.APPROVED });
    mockRepos.quote.findById.mockResolvedValue(quote);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: 'any', quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceNotFoundException when part supply not found', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    mockRepos.quote.findById.mockResolvedValue(quote);
    mockRepos.partSupply.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: 'bad', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw ResourceConflictException when part supply already exists in quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const partSupply = createMockPartSupply({ salePrice: 80 });
    const existing = createMockQuotePartSupply({ quoteId: quote.id, partSupplyId: partSupply.id });

    mockRepos.quote.findById.mockResolvedValue(quote);
    mockRepos.partSupply.findById.mockResolvedValue(partSupply);
    mockRepos.quotePartSupply.findOne.mockResolvedValue(existing);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: partSupply.id, quantity: 2 }),
    ).rejects.toThrow(ResourceConflictException);
  });
});
