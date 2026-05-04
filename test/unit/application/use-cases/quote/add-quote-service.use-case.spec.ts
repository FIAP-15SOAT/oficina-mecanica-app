import { AddQuoteServiceUseCase } from '@application/use-cases/quote/add-quote-service.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import {
  createMockQuote,
  createMockQuoteRepository,
  createMockQuoteService,
  createMockQuoteServiceRepository,
  createMockQuotePartSupplyRepository,
} from '../../../../helpers/quote-mock.factory';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('AddQuoteServiceUseCase', () => {
  let useCase: AddQuoteServiceUseCase;
  let mockRepos: ReturnType<typeof buildMockRepos>;
  let mockUow: { executeTransaction: jest.Mock };

  function buildMockRepos() {
    return {
      quote: createMockQuoteRepository(),
      quoteService: createMockQuoteServiceRepository(),
      quotePartSupply: createMockQuotePartSupplyRepository(),
      service: createMockServiceRepository(),
    };
  }

  beforeEach(() => {
    mockRepos = buildMockRepos();
    mockUow = {
      executeTransaction: jest
        .fn()
        .mockImplementation((work: (repos: ReturnType<typeof buildMockRepos>) => unknown) =>
          work(mockRepos),
        ),
    };
    useCase = new AddQuoteServiceUseCase(mockUow);
  });

  it('should add a service and recalculate totals', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const service = createMockService({ basePrice: 150 });
    const qs = createMockQuoteService({
      quoteId: quote.id,
      serviceId: service.id,
      totalPrice: 150,
    });
    const updatedQuote = createMockQuote({ ...quote, servicesAmount: 150, totalAmount: 150 });

    mockRepos.quote.findById.mockResolvedValue(quote);
    mockRepos.service.findById.mockResolvedValue(service);
    mockRepos.quoteService.findOne.mockResolvedValue(null);
    mockRepos.quoteService.create.mockResolvedValue(qs);
    mockRepos.quoteService.findByQuoteId.mockResolvedValue([qs]);
    mockRepos.quotePartSupply.findByQuoteId.mockResolvedValue([]);
    mockRepos.quote.update.mockResolvedValue(updatedQuote);

    const result = await useCase.execute({
      quoteId: quote.id,
      serviceId: service.id,
      quantity: 1,
    });

    expect(result.servicesAmount).toBe(150);
    expect(mockRepos.quoteService.create).toHaveBeenCalledTimes(1);
    expect(mockRepos.quote.update).toHaveBeenCalledTimes(1);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    mockRepos.quote.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', serviceId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    mockRepos.quote.findById.mockResolvedValue(quote);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: 'any', quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceNotFoundException when service not found', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    mockRepos.quote.findById.mockResolvedValue(quote);
    mockRepos.service.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: 'bad', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw ResourceConflictException when service already exists in quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const service = createMockService({ basePrice: 150 });
    const existing = createMockQuoteService({ quoteId: quote.id, serviceId: service.id });

    mockRepos.quote.findById.mockResolvedValue(quote);
    mockRepos.service.findById.mockResolvedValue(service);
    mockRepos.quoteService.findOne.mockResolvedValue(existing);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: service.id, quantity: 1 }),
    ).rejects.toThrow(ResourceConflictException);
  });
});
