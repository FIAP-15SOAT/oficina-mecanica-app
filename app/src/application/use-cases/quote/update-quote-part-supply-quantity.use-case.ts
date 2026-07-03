import { Quote } from '@domain/entities/quote.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { UpdateQuotePartSupplyQuantityDto } from '@application/ports/input/quote/dto/update-quote-part-supply-quantity.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateQuotePartSupplyQuantityUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(dto: UpdateQuotePartSupplyQuantityDto): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findByIdWithDetails(dto.quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', dto.quoteId);
      }

      const item = quote.updatePartSupplyQuantity(dto.partSupplyId, dto.quantity);

      await repos.quote.updatePartSupplyItemQuantity(item);
      return repos.quote.update(quote);
    });
  }
}
