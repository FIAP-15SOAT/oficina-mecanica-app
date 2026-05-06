import { UpdateQuoteServiceQuantityUseCase } from '@application/use-cases/quote/update-quote-service-quantity.use-case';
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

describe('UpdateQuoteServiceQuantityUseCase', () => {
  let useCase: UpdateQuoteServiceQuantityUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    useCase = new UpdateQuoteServiceQuantityUseCase(quoteRepository);
  });

  it('should update a service item and recalculate totals', async () => {
    const existing = createMockQuoteService({
      serviceId: 'svc-id',
      quantity: 1,
      unitPrice: 100,
      totalPrice: 100,
    });

    const quote = createMockQuote({
      status: QuoteStatus.PENDING,
      servicesAmount: 100,
      totalAmount: 100,
    });
    quote.services = [existing];

    quoteRepository.findById.mockResolvedValue(quote);
    (quoteRepository.updateServiceItemQuantity as jest.Mock).mockResolvedValue(undefined);

    const result = await useCase.execute({
      quoteId: quote.id,
      serviceId: 'svc-id',
      quantity: 2,
    });

    expect(quoteRepository.updateServiceItemQuantity).toHaveBeenCalledTimes(1);
    expect(result.servicesAmount).toBe(200);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', serviceId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not editable', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    quote.services = [];
    quoteRepository.findById.mockResolvedValue(quote);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: 'any', quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw EntityNotFoundException when service item not found in quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    quote.services = [];
    quoteRepository.findById.mockResolvedValue(quote);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: 'bad', quantity: 1 }),
    ).rejects.toThrow(EntityNotFoundException);
  });
});
