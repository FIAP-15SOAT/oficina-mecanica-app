import { RemoveQuoteServiceUseCase } from '@application/use-cases/quote/remove-quote-service.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import {
  createMockQuote,
  createMockQuoteRepository,
  createMockQuoteService,
} from '../../../../helpers/quote-mock.factory';

describe('RemoveQuoteServiceUseCase', () => {
  let useCase: RemoveQuoteServiceUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    useCase = new RemoveQuoteServiceUseCase(quoteRepository);
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
    });
    quote.services = [existingItem];

    quoteRepository.findById.mockResolvedValue(quote);
    (quoteRepository.removeServiceItem as jest.Mock).mockResolvedValue(undefined);

    const result = await useCase.execute(quote.id, 'svc-id');

    expect(quoteRepository.removeServiceItem).toHaveBeenCalledWith(quote, 'svc-id');
    expect(result.servicesAmount).toBe(0);
    expect(result.services).toHaveLength(0);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('bad', 'svc')).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    quote.services = [];
    quoteRepository.findById.mockResolvedValue(quote);

    await expect(useCase.execute(quote.id, 'svc')).rejects.toThrow(BusinessRuleViolationException);

    expect(quoteRepository.removeServiceItem).not.toHaveBeenCalled();
  });

  it('should throw EntityNotFoundException when service is not associated with the quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    quote.services = [];
    quoteRepository.findById.mockResolvedValue(quote);

    await expect(useCase.execute(quote.id, 'nonexistent-service')).rejects.toThrow(
      EntityNotFoundException,
    );

    expect(quoteRepository.removeServiceItem).not.toHaveBeenCalled();
  });
});
