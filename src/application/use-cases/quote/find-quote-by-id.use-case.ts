import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class FindQuoteByIdUseCase {
  constructor(private readonly quoteRepository: IQuoteRepository) {}

  async execute(id: string): Promise<Quote> {
    const quote = await this.quoteRepository.findById(id);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', id);
    }

    return quote;
  }
}
