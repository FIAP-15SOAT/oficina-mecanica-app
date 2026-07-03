import { RemoveQuotePartSupplyUseCase } from '@application/use-cases/quote/remove-quote-part-supply.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import {
  createMockQuote,
  createMockQuotePartSupply,
  createMockQuoteRepository,
  createMockUnitOfWork,
} from '../../../../helpers/quote-mock.factory';

describe('RemoveQuotePartSupplyUseCase', () => {
  let useCase: RemoveQuotePartSupplyUseCase;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let quoteRepository: jest.Mocked<IQuoteRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    unitOfWork = createMockUnitOfWork(quoteRepository);
    useCase = new RemoveQuotePartSupplyUseCase(unitOfWork);
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

    const updatedQuote = createMockQuote({ status: QuoteStatus.PENDING, partsAmount: 0 });

    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    quoteRepository.removePartSupplyItem.mockResolvedValue(undefined);
    quoteRepository.update.mockResolvedValue(updatedQuote);

    const result = await useCase.execute(quote.id, 'part-id');

    expect(unitOfWork.executeTransaction).toHaveBeenCalledTimes(1);
    expect(quoteRepository.removePartSupplyItem).toHaveBeenCalledWith(quote.id, 'part-id');
    expect(quoteRepository.update).toHaveBeenCalledTimes(1);
    expect(result.partsAmount).toBe(0);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findByIdWithDetails.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id', 'part-id')).rejects.toThrow(
      ResourceNotFoundException,
    );

    expect(quoteRepository.removePartSupplyItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT, partsSupplies: [] });
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);

    await expect(useCase.execute(quote.id, 'part-id')).rejects.toThrow(
      BusinessRuleViolationException,
    );

    expect(quoteRepository.removePartSupplyItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw EntityNotFoundException when part/supply is not associated with the quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING, partsSupplies: [] });
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);

    await expect(useCase.execute(quote.id, 'nonexistent-part')).rejects.toThrow(
      EntityNotFoundException,
    );

    expect(quoteRepository.removePartSupplyItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });
});
