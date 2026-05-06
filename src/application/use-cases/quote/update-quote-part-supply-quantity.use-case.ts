import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { UpdateQuotePartSupplyQuantityDto } from '@domain/interfaces/use-cases/quote/dto/update-quote-part-supply-quantity.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateQuotePartSupplyQuantityUseCase {
  constructor(private readonly quoteRepository: IQuoteRepository) {}

  async execute(dto: UpdateQuotePartSupplyQuantityDto): Promise<Quote> {
    const quote = await this.quoteRepository.findById(dto.quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', dto.quoteId);
    }

    const item = quote.updatePartSupplyQuantity(dto.partSupplyId, dto.quantity);

    await this.quoteRepository.updatePartSupplyItemQuantity(quote, item);

    return quote;
  }
}
