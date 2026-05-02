import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IQuoteServiceRepository } from '@domain/interfaces/repositories/quote-service.repository.interface';
import { IQuotePartSupplyRepository } from '@domain/interfaces/repositories/quote-part-supply.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class FindQuoteByIdUseCase {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly quoteServiceRepository: IQuoteServiceRepository,
    private readonly quotePartSupplyRepository: IQuotePartSupplyRepository,
  ) { }

  async execute(id: string): Promise<Quote> {
    const quote = await this.quoteRepository.findById(id);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', id);
    }

    const [services, parts] = await Promise.all([
      this.quoteServiceRepository.findByQuoteId(id),
      this.quotePartSupplyRepository.findByQuoteId(id),
    ]);

    quote.services = services;
    quote.partsSupplies = parts;

    return quote;
  }
}
