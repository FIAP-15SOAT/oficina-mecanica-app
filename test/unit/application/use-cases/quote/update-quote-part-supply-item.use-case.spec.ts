import { UpdateQuotePartSupplyQuantityUseCase } from '@application/use-cases/quote/update-quote-part-supply-quantity.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import {
  createMockQuote,
  createMockQuotePartSupply,
  createMockQuoteRepository,
} from '../../../../helpers/quote-mock.factory';

describe('UpdateQuotePartSupplyQuantityUseCase', () => {
  let useCase: UpdateQuotePartSupplyQuantityUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    useCase = new UpdateQuotePartSupplyQuantityUseCase(quoteRepository);
  });

  it('should update a part supply item and recalculate totals', async () => {
    const existing = createMockQuotePartSupply({
      partSupplyId: 'part-id',
      quantity: 1,
      unitPrice: 80,
      totalPrice: 80,
    });

    const quote = createMockQuote({
      status: QuoteStatus.PENDING,
      partsAmount: 80,
      totalAmount: 80,
      partsSupplies: [existing],
    });

    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    (quoteRepository.updatePartSupplyItemQuantity as jest.Mock).mockResolvedValue(undefined);

    const result = await useCase.execute({
      quoteId: quote.id,
      partSupplyId: 'part-id',
      quantity: 3,
    });

    expect(quoteRepository.updatePartSupplyItemQuantity).toHaveBeenCalledTimes(1);
    expect(result.partsAmount).toBe(240);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findByIdWithDetails.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', partSupplyId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not editable', async () => {
    const quote = createMockQuote({ status: QuoteStatus.APPROVED, partsSupplies: [] });
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: 'any', quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw EntityNotFoundException when part supply item not found in quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING, partsSupplies: [] });
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: 'bad', quantity: 1 }),
    ).rejects.toThrow(EntityNotFoundException);
  });
});
