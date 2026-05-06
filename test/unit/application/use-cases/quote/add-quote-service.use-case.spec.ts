import { AddQuoteServiceUseCase } from '@application/use-cases/quote/add-quote-service.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import {
  createMockQuote,
  createMockQuoteRepository,
  createMockQuoteService,
} from '../../../../helpers/quote-mock.factory';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('AddQuoteServiceUseCase', () => {
  let useCase: AddQuoteServiceUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    serviceRepository = createMockServiceRepository();
    useCase = new AddQuoteServiceUseCase(quoteRepository, serviceRepository);
  });

  it('should add a service and recalculate totals', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    quote.services = [];
    const service = createMockService({ basePrice: 150 });

    quoteRepository.findById.mockResolvedValue(quote);
    serviceRepository.findById.mockResolvedValue(service);
    (quoteRepository.addServiceItem as jest.Mock).mockResolvedValue(undefined);

    const result = await useCase.execute({
      quoteId: quote.id,
      serviceId: service.id,
      quantity: 1,
    });

    expect(quoteRepository.addServiceItem).toHaveBeenCalledTimes(1);
    expect(result.servicesAmount).toBe(150);
    expect(result.services).toHaveLength(1);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', serviceId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    quote.services = [];
    const service = createMockService();
    quoteRepository.findById.mockResolvedValue(quote);
    serviceRepository.findById.mockResolvedValue(service);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: service.id, quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceNotFoundException when service not found', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    quote.services = [];
    quoteRepository.findById.mockResolvedValue(quote);
    serviceRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: 'bad', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when service already exists in quote', async () => {
    const service = createMockService({ basePrice: 150 });
    const existing = createMockQuoteService({ serviceId: service.id });
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    quote.services = [existing];

    quoteRepository.findById.mockResolvedValue(quote);
    serviceRepository.findById.mockResolvedValue(service);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: service.id, quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);

    expect(quoteRepository.addServiceItem).not.toHaveBeenCalled();
  });
});
