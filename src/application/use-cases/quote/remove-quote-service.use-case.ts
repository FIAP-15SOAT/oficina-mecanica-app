import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class RemoveQuoteServiceUseCase {
  constructor(private readonly quoteRepository: IQuoteRepository) {}

  async execute(quoteId: string, serviceId: string): Promise<Quote> {
    const quote = await this.quoteRepository.findById(quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', quoteId);
    }

    quote.removeService(serviceId);

    await this.quoteRepository.removeServiceItem(quote, serviceId);

    return quote;
  }
}
