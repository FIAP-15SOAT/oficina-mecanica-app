import { AddQuoteServiceUseCase } from '@application/use-cases/quote/add-quote-service.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { createMockQuote, createMockQuoteService } from '../../../../helpers/quote-mock.factory';
import { createMockService } from '../../../../helpers/service-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';

describe('AddQuoteServiceUseCase', () => {
  let useCase: AddQuoteServiceUseCase;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let quoteRepository: jest.Mocked<IQuoteRepository>;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    const mock = createMockUnitOfWorkWithRepos();
    unitOfWork = mock.unitOfWork;
    quoteRepository = mock.repos.quote as jest.Mocked<IQuoteRepository>;
    serviceRepository = mock.repos.service as jest.Mocked<IServiceRepository>;
    useCase = new AddQuoteServiceUseCase(unitOfWork);
  });

  it('should add a service and recalculate totals', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [] });
    const service = createMockService({ basePrice: 150 });
    const updatedQuote = createMockQuote({ status: QuoteStatus.PENDING, servicesAmount: 150 });

    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    serviceRepository.findById.mockResolvedValue(service);
    quoteRepository.addServiceItem.mockResolvedValue(undefined);
    quoteRepository.update.mockResolvedValue(updatedQuote);

    const result = await useCase.execute({
      quoteId: quote.id,
      serviceId: service.id,
      quantity: 1,
    });

    expect(unitOfWork.executeTransaction).toHaveBeenCalledTimes(1);
    expect(quoteRepository.addServiceItem).toHaveBeenCalledTimes(1);
    expect(quoteRepository.update).toHaveBeenCalledTimes(1);
    expect(result.servicesAmount).toBe(150);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findByIdWithDetails.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', serviceId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(quoteRepository.addServiceItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when service not found', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [] });
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    serviceRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: 'bad', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(quoteRepository.addServiceItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT, services: [] });
    const service = createMockService();
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    serviceRepository.findById.mockResolvedValue(service);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: service.id, quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);

    expect(quoteRepository.addServiceItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when service already exists in quote', async () => {
    const service = createMockService({ basePrice: 150 });
    const existing = createMockQuoteService({ serviceId: service.id });
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [existing] });

    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    serviceRepository.findById.mockResolvedValue(service);

    await expect(
      useCase.execute({ quoteId: quote.id, serviceId: service.id, quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);

    expect(quoteRepository.addServiceItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });
});
