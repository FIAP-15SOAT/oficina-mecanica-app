import { FindQuoteByIdUseCase } from '@application/use-cases/quote/find-quote-by-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import {
  createMockQuote,
  createMockQuoteService,
  createMockQuotePartSupply,
  createMockQuoteRepository,
} from '../../../../helpers/quote-mock.factory';

describe('FindQuoteByIdUseCase', () => {
  let useCase: FindQuoteByIdUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    useCase = new FindQuoteByIdUseCase(quoteRepository);
  });

  it('should return quote with populated services and parts loaded by findById', async () => {
    const service = createMockQuoteService();
    const part = createMockQuotePartSupply();
    const quote = createMockQuote();
    quote.services = [service];
    quote.partsSupplies = [part];

    quoteRepository.findById.mockResolvedValue(quote);

    const result = await useCase.execute(quote.id);

    expect(result).toBe(quote);
    expect(result.services).toHaveLength(1);
    expect(result.partsSupplies).toHaveLength(1);
  });

  it('should return quote when findById returns it without services', async () => {
    const quote = createMockQuote();
    quoteRepository.findById.mockResolvedValue(quote);

    const result = await useCase.execute(quote.id);

    expect(result).toBe(quote);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
  });
});
