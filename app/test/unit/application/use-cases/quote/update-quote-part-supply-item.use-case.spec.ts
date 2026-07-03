import { UpdateQuotePartSupplyQuantityUseCase } from '@application/use-cases/quote/update-quote-part-supply-quantity.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import {
  createMockQuote,
  createMockQuotePartSupply,
  createMockQuoteRepository,
  createMockUnitOfWork,
} from '../../../../helpers/quote-mock.factory';

describe('UpdateQuotePartSupplyQuantityUseCase', () => {
  let useCase: UpdateQuotePartSupplyQuantityUseCase;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let quoteRepository: jest.Mocked<IQuoteRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    unitOfWork = createMockUnitOfWork(quoteRepository);
    useCase = new UpdateQuotePartSupplyQuantityUseCase(unitOfWork);
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
    const updatedQuote = createMockQuote({ status: QuoteStatus.PENDING, partsAmount: 240 });

    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    quoteRepository.updatePartSupplyItemQuantity.mockResolvedValue(undefined);
    quoteRepository.update.mockResolvedValue(updatedQuote);

    const result = await useCase.execute({
      quoteId: quote.id,
      partSupplyId: 'part-id',
      quantity: 3,
    });

    expect(unitOfWork.executeTransaction).toHaveBeenCalledTimes(1);
    expect(quoteRepository.updatePartSupplyItemQuantity).toHaveBeenCalledTimes(1);
    expect(quoteRepository.update).toHaveBeenCalledTimes(1);
    expect(result.partsAmount).toBe(240);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findByIdWithDetails.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', partSupplyId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(quoteRepository.updatePartSupplyItemQuantity).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when quote is not editable', async () => {
    const quote = createMockQuote({ status: QuoteStatus.APPROVED, partsSupplies: [] });
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: 'any', quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);

    expect(quoteRepository.updatePartSupplyItemQuantity).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw EntityNotFoundException when part supply item not found in quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING, partsSupplies: [] });
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: 'bad', quantity: 1 }),
    ).rejects.toThrow(EntityNotFoundException);

    expect(quoteRepository.updatePartSupplyItemQuantity).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });
});
