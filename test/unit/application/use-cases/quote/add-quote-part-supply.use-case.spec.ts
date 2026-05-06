import { AddQuotePartSupplyUseCase } from '@application/use-cases/quote/add-quote-part-supply.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import {
  createMockQuote,
  createMockQuotePartSupply,
  createMockQuoteRepository,
} from '../../../../helpers/quote-mock.factory';
import {
  createMockPartSupplyRepository,
  createMockPartSupply,
} from '../../../../helpers/part-supply-mock.factory';

describe('AddQuotePartSupplyUseCase', () => {
  let useCase: AddQuotePartSupplyUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    partSupplyRepository = createMockPartSupplyRepository();
    useCase = new AddQuotePartSupplyUseCase(quoteRepository, partSupplyRepository);
  });

  it('should add a part supply and recalculate totals', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    quote.partsSupplies = [];
    const partSupply = createMockPartSupply({ salePrice: 80 });

    quoteRepository.findById.mockResolvedValue(quote);
    partSupplyRepository.findById.mockResolvedValue(partSupply);
    (quoteRepository.addPartSupplyItem as jest.Mock).mockResolvedValue(undefined);

    const result = await useCase.execute({
      quoteId: quote.id,
      partSupplyId: partSupply.id,
      quantity: 2,
    });

    expect(quoteRepository.addPartSupplyItem).toHaveBeenCalledTimes(1);
    expect(result.partsAmount).toBe(160);
    expect(result.partsSupplies).toHaveLength(1);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', partSupplyId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.APPROVED });
    quote.partsSupplies = [];
    const partSupply = createMockPartSupply();
    quoteRepository.findById.mockResolvedValue(quote);
    partSupplyRepository.findById.mockResolvedValue(partSupply);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: partSupply.id, quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceNotFoundException when part supply not found', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    quote.partsSupplies = [];
    quoteRepository.findById.mockResolvedValue(quote);
    partSupplyRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: 'bad', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when part supply already exists in quote', async () => {
    const partSupply = createMockPartSupply({ salePrice: 80 });
    const existing = createMockQuotePartSupply({ partSupplyId: partSupply.id });
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    quote.partsSupplies = [existing];

    quoteRepository.findById.mockResolvedValue(quote);
    partSupplyRepository.findById.mockResolvedValue(partSupply);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: partSupply.id, quantity: 2 }),
    ).rejects.toThrow(BusinessRuleViolationException);

    expect(quoteRepository.addPartSupplyItem).not.toHaveBeenCalled();
  });
});
