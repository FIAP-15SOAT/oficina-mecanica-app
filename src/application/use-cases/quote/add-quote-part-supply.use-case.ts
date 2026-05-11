import { Quote } from '@domain/entities/quote.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { AddQuotePartSupplyDto } from '@domain/interfaces/use-cases/quote/dto/add-quote-part-supply.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class AddQuotePartSupplyUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(dto: AddQuotePartSupplyDto): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findByIdWithDetails(dto.quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', dto.quoteId);
      }

      const partSupply = await repos.partSupply.findById(dto.partSupplyId);

      if (!partSupply) {
        throw new ResourceNotFoundException('Peça/Insumo', dto.partSupplyId);
      }

      const item = quote.addPartSupply(partSupply, dto.quantity);

      await repos.quote.addPartSupplyItem(item);
      return repos.quote.update(quote);
    });
  }
}
