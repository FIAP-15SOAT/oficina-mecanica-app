import { RemoveQuoteServiceUseCase } from '@application/use-cases/quote/remove-quote-service.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import {
  createMockQuote,
  createMockQuoteRepository,
  createMockQuoteService,
  createMockUnitOfWork,
} from '../../../../helpers/quote-mock.factory';

describe('RemoveQuoteServiceUseCase', () => {
  let useCase: RemoveQuoteServiceUseCase;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let quoteRepository: jest.Mocked<IQuoteRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    unitOfWork = createMockUnitOfWork(quoteRepository);
    useCase = new RemoveQuoteServiceUseCase(unitOfWork);
  });

  it('should remove a service and recalculate totals', async () => {
    const existingItem = createMockQuoteService({
      serviceId: 'svc-id',
      unitPrice: 100,
      quantity: 1,
      totalPrice: 100,
    });

    const quote = createMockQuote({
      status: QuoteStatus.PENDING,
      servicesAmount: 100,
      totalAmount: 100,
      services: [existingItem],
    });
    const updatedQuote = createMockQuote({ status: QuoteStatus.PENDING, servicesAmount: 0 });

    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    quoteRepository.removeServiceItem.mockResolvedValue(undefined);
    quoteRepository.update.mockResolvedValue(updatedQuote);

    const result = await useCase.execute(quote.id, 'svc-id');

    expect(unitOfWork.executeTransaction).toHaveBeenCalledTimes(1);
    expect(quoteRepository.removeServiceItem).toHaveBeenCalledWith(quote.id, 'svc-id');
    expect(quoteRepository.update).toHaveBeenCalledTimes(1);
    expect(result.servicesAmount).toBe(0);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findByIdWithDetails.mockResolvedValue(null);

    await expect(useCase.execute('bad', 'svc')).rejects.toThrow(ResourceNotFoundException);

    expect(quoteRepository.removeServiceItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT, services: [] });
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);

    await expect(useCase.execute(quote.id, 'svc')).rejects.toThrow(BusinessRuleViolationException);

    expect(quoteRepository.removeServiceItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw EntityNotFoundException when service is not associated with the quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [] });
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);

    await expect(useCase.execute(quote.id, 'nonexistent-service')).rejects.toThrow(
      EntityNotFoundException,
    );

    expect(quoteRepository.removeServiceItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });
});
