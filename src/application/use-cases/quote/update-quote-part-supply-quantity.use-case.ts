import { Quote } from '@domain/entities/quote.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { UpdateQuotePartSupplyQuantityDto } from '@domain/interfaces/use-cases/quote/dto/update-quote-part-supply-item.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateQuotePartSupplyQuantityUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(dto: UpdateQuotePartSupplyQuantityDto): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findById(dto.quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', dto.quoteId);
      }

      quote.ensureCanChangeItems();

      const existing = await repos.quotePartSupply.findOne(dto.quoteId, dto.partSupplyId);

      if (!existing) {
        throw new ResourceNotFoundException('Peça/Insumo no orçamento', dto.partSupplyId);
      }

      existing.updateQuantity(dto.quantity);


      await repos.quotePartSupply.update(existing);

      const [allServices, allParts] = await Promise.all([
        repos.quoteService.findByQuoteId(dto.quoteId),
        repos.quotePartSupply.findByQuoteId(dto.quoteId),
      ]);

      quote.services = allServices;
      quote.partsSupplies = allParts;
      quote.recalculateTotals();

      return repos.quote.update(quote);
    });
  }
}

