import { Quote } from '@domain/entities/quote.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { UpdateQuoteServiceQuantityDto } from '@domain/interfaces/use-cases/quote/dto/update-quote-service-quantity.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateQuoteServiceQuantityUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(dto: UpdateQuoteServiceQuantityDto): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findByIdWithDetails(dto.quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', dto.quoteId);
      }

      const item = quote.updateServiceQuantity(dto.serviceId, dto.quantity);

      await repos.quote.updateServiceItemQuantity(item);
      return repos.quote.update(quote);
    });
  }
}
