import { RemoveQuotePartSupplyUseCase } from '@application/use-cases/quote/remove-quote-part-supply.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import {
  createMockQuote,
  createMockQuotePartSupply,
  createMockQuoteRepository,
} from '../../../../helpers/quote-mock.factory';

describe('RemoveQuotePartSupplyUseCase', () => {
  let useCase: RemoveQuotePartSupplyUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    useCase = new RemoveQuotePartSupplyUseCase(quoteRepository);
  });

  it('should remove part supply from quote and recalculate totals', async () => {
    const partSupply = createMockQuotePartSupply({
      partSupplyId: 'part-id',
      quantity: 2,
      unitPrice: 50,
      totalPrice: 100,
    });

    const quote = createMockQuote({
      status: QuoteStatus.PENDING,
      partsAmount: 100,
      totalAmount: 100,
      partsSupplies: [partSupply],
    });

    quoteRepository.findById.mockResolvedValue(quote);
    (quoteRepository.removePartSupplyItem as jest.Mock).mockResolvedValue(undefined);

    await useCase.execute(quote.id, 'part-id');

    expect(quoteRepository.removePartSupplyItem).toHaveBeenCalledWith(quote, 'part-id');
    expect(quote.partsSupplies).toHaveLength(0);
    expect(quote.partsAmount).toBe(0);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id', 'part-id')).rejects.toThrow(
      ResourceNotFoundException,
    );
    expect(quoteRepository.removePartSupplyItem).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT, partsSupplies: [] });
    quoteRepository.findById.mockResolvedValue(quote);

    await expect(useCase.execute(quote.id, 'part-id')).rejects.toThrow(
      BusinessRuleViolationException,
    );
    expect(quoteRepository.removePartSupplyItem).not.toHaveBeenCalled();
  });

  it('should throw EntityNotFoundException when part/supply is not associated with the quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING, partsSupplies: [] });
    quoteRepository.findById.mockResolvedValue(quote);

    await expect(useCase.execute(quote.id, 'nonexistent-part')).rejects.toThrow(
      EntityNotFoundException,
    );

    expect(quoteRepository.removePartSupplyItem).not.toHaveBeenCalled();
  });
});
