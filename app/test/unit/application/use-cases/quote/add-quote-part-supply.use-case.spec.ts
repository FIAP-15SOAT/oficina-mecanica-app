import { AddQuotePartSupplyUseCase } from '@application/use-cases/quote/add-quote-part-supply.use-case';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { createMockQuote, createMockQuotePartSupply } from '../../../../helpers/quote-mock.factory';
import { createMockPartSupply } from '../../../../helpers/part-supply-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';

describe('AddQuotePartSupplyUseCase', () => {
  let useCase: AddQuotePartSupplyUseCase;
  let unitOfWork: jest.Mocked<IUnitOfWork>;
  let quoteRepository: jest.Mocked<IQuoteRepository>;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;

  beforeEach(() => {
    const mock = createMockUnitOfWorkWithRepos();
    unitOfWork = mock.unitOfWork;
    quoteRepository = mock.repos.quote as jest.Mocked<IQuoteRepository>;
    partSupplyRepository = mock.repos.partSupply as jest.Mocked<IPartSupplyRepository>;
    useCase = new AddQuotePartSupplyUseCase(unitOfWork);
  });

  it('should add a part supply and recalculate totals', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING, partsSupplies: [] });
    const partSupply = createMockPartSupply({ salePrice: 80 });
    const updatedQuote = createMockQuote({ status: QuoteStatus.PENDING, partsAmount: 160 });

    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    partSupplyRepository.findById.mockResolvedValue(partSupply);
    quoteRepository.addPartSupplyItem.mockResolvedValue(undefined);
    quoteRepository.update.mockResolvedValue(updatedQuote);

    const result = await useCase.execute({
      quoteId: quote.id,
      partSupplyId: partSupply.id,
      quantity: 2,
    });

    expect(unitOfWork.executeTransaction).toHaveBeenCalledTimes(1);
    expect(quoteRepository.addPartSupplyItem).toHaveBeenCalledTimes(1);
    expect(quoteRepository.update).toHaveBeenCalledTimes(1);
    expect(result.partsAmount).toBe(160);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    quoteRepository.findByIdWithDetails.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'bad', partSupplyId: 'any', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(quoteRepository.addPartSupplyItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when part supply not found', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING, partsSupplies: [] });
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    partSupplyRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: 'bad', quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(quoteRepository.addPartSupplyItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.APPROVED, partsSupplies: [] });
    const partSupply = createMockPartSupply();
    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    partSupplyRepository.findById.mockResolvedValue(partSupply);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: partSupply.id, quantity: 1 }),
    ).rejects.toThrow(BusinessRuleViolationException);

    expect(quoteRepository.addPartSupplyItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when part supply already exists in quote', async () => {
    const partSupply = createMockPartSupply({ salePrice: 80 });
    const existing = createMockQuotePartSupply({ partSupplyId: partSupply.id });
    const quote = createMockQuote({ status: QuoteStatus.PENDING, partsSupplies: [existing] });

    quoteRepository.findByIdWithDetails.mockResolvedValue(quote);
    partSupplyRepository.findById.mockResolvedValue(partSupply);

    await expect(
      useCase.execute({ quoteId: quote.id, partSupplyId: partSupply.id, quantity: 2 }),
    ).rejects.toThrow(BusinessRuleViolationException);

    expect(quoteRepository.addPartSupplyItem).not.toHaveBeenCalled();
    expect(quoteRepository.update).not.toHaveBeenCalled();
  });
});
