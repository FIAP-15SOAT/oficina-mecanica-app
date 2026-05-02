import { FindQuoteByIdUseCase } from '@application/use-cases/quote/find-quote-by-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IQuoteServiceRepository } from '@domain/interfaces/repositories/quote-service.repository.interface';
import { IQuotePartSupplyRepository } from '@domain/interfaces/repositories/quote-part-supply.repository.interface';
import {
  createMockQuote,
  createMockQuoteService,
  createMockQuotePartSupply,
  createMockQuoteRepository,
  createMockQuoteServiceRepository,
  createMockQuotePartSupplyRepository,
} from '../../../../helpers/quote-mock.factory';

describe('FindQuoteByIdUseCase', () => {
  let useCase: FindQuoteByIdUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;
  let quoteServiceRepository: jest.Mocked<IQuoteServiceRepository>;
  let quotePartSupplyRepository: jest.Mocked<IQuotePartSupplyRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    quoteServiceRepository = createMockQuoteServiceRepository();
    quotePartSupplyRepository = createMockQuotePartSupplyRepository();
    useCase = new FindQuoteByIdUseCase(
      quoteRepository,
      quoteServiceRepository,
      quotePartSupplyRepository,
    );
  });

  it('should return quote with populated services and parts', async () => {
    const quote = createMockQuote();
    const service = createMockQuoteService({ quoteId: quote.id });
    const part = createMockQuotePartSupply({ quoteId: quote.id });

    quoteRepository.findById.mockResolvedValue(quote);
    quoteServiceRepository.findByQuoteId.mockResolvedValue([service]);
    quotePartSupplyRepository.findByQuoteId.mockResolvedValue([part]);

    const result = await useCase.execute(quote.id);

    expect(result).toBe(quote);
    expect(result.services).toHaveLength(1);
    expect(result.partsSupplies).toHaveLength(1);
  });

  it('should return quote with empty services and parts when none exist', async () => {
    const quote = createMockQuote();
    quoteRepository.findById.mockResolvedValue(quote);
    quoteServiceRepository.findByQuoteId.mockResolvedValue([]);
    quotePartSupplyRepository.findByQuoteId.mockResolvedValue([]);

    const result = await useCase.execute(quote.id);

    expect(result.services).toHaveLength(0);
    expect(result.partsSupplies).toHaveLength(0);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
    expect(quoteServiceRepository.findByQuoteId).not.toHaveBeenCalled();
  });
});
