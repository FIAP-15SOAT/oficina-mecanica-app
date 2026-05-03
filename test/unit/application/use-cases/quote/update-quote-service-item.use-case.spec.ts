import { UpdateQuoteServiceQuantityUseCase } from '@application/use-cases/quote/update-quote-service-quantity.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { createMockQuote, createMockQuoteService } from '../../../../helpers/quote-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';

describe('UpdateQuoteServiceQuantityUseCase', () => {
  let useCase: UpdateQuoteServiceQuantityUseCase;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUow = unitOfWork;
    useCase = new UpdateQuoteServiceQuantityUseCase(mockUow);
  });

  it('should update a service item and recalculate totals', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const existing = createMockQuoteService({ quoteId: quote.id, quantity: 1, unitPrice: 100, totalPrice: 100 });
    const updatedService = createMockQuoteService({ ...existing, quantity: 2, unitPrice: 100, totalPrice: 200 });
    const updatedQuote = createMockQuote({ ...quote, servicesAmount: 200, totalAmount: 200 });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.quoteService.findOne as jest.Mock).mockResolvedValue(existing);
    (mockRepos.quoteService.update as jest.Mock).mockResolvedValue(updatedService);
    (mockRepos.quoteService.findByQuoteId as jest.Mock).mockResolvedValue([updatedService]);
    (mockRepos.quotePartSupply.findByQuoteId as jest.Mock).mockResolvedValue([]);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(updatedQuote);

    const result = await useCase.execute({
      quoteId: quote.id,
      serviceId: existing.serviceId,
      quantity: 2,
    });

    expect(mockRepos.quoteService.update).toHaveBeenCalledTimes(1);
    expect(mockRepos.quote.update).toHaveBeenCalledTimes(1);
    expect(result.servicesAmount).toBe(200);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', serviceId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });


  it('should throw BusinessRuleViolationException when quote is not editable', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: 'any', quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceNotFoundException when service item not found in quote', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.quoteService.findOne as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: 'bad', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
