import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { UpdateQuoteServiceQuantityDto } from '@domain/interfaces/use-cases/quote/dto/update-quote-service-quantity.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateQuoteServiceQuantityUseCase {
  constructor(private readonly quoteRepository: IQuoteRepository) {}

  async execute(dto: UpdateQuoteServiceQuantityDto): Promise<Quote> {
    const quote = await this.quoteRepository.findById(dto.quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', dto.quoteId);
    }

    const item = quote.updateServiceQuantity(dto.serviceId, dto.quantity);

    await this.quoteRepository.updateServiceItemQuantity(quote, item);

    return quote;
  }
}
