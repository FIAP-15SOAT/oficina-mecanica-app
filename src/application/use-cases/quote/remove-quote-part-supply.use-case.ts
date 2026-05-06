import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class RemoveQuotePartSupplyUseCase {
  constructor(private readonly quoteRepository: IQuoteRepository) {}

  async execute(quoteId: string, partSupplyId: string): Promise<Quote> {
    const quote = await this.quoteRepository.findById(quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', quoteId);
    }

    quote.removePartSupply(partSupplyId);

    await this.quoteRepository.removePartSupplyItem(quote, partSupplyId);

    return quote;
  }
}
