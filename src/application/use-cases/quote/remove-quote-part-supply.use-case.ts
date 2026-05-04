import { Quote } from '@domain/entities/quote.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class RemoveQuotePartSupplyUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(quoteId: string, partSupplyId: string): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findById(quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', quoteId);
      }

      quote.ensureCanChangeItems();

      const item = await repos.quotePartSupply.findOne(quoteId, partSupplyId);

      if (!item) {
        throw new ResourceNotFoundException('Peça/Insumo do orçamento', partSupplyId);
      }

      await repos.quotePartSupply.remove(quoteId, partSupplyId);

      const [allServices, allParts] = await Promise.all([
        repos.quoteService.findByQuoteId(quoteId),
        repos.quotePartSupply.findByQuoteId(quoteId),
      ]);

      quote.services = allServices;
      quote.partsSupplies = allParts;
      quote.recalculateTotals();

      return repos.quote.update(quote);
    });
  }
}
