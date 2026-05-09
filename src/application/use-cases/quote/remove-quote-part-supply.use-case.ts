import { Quote } from '@domain/entities/quote.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class RemoveQuotePartSupplyUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(quoteId: string, partSupplyId: string): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findByIdWithDetails(quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', quoteId);
      }

      quote.removePartSupply(partSupplyId);

      await repos.quote.removePartSupplyItem(quoteId, partSupplyId);
      return repos.quote.update(quote);
    });
  }
}
