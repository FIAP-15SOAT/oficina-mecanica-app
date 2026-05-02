import { QuoteService } from '@domain/entities/quote-service.entity';

export interface IQuoteServiceRepository {
  create(quoteService: QuoteService): Promise<QuoteService>;
  update(quoteService: QuoteService): Promise<QuoteService>;
  findOne(quoteId: string, serviceId: string): Promise<QuoteService | null>;
  remove(quoteId: string, serviceId: string): Promise<void>;
  findByQuoteId(quoteId: string): Promise<QuoteService[]>;
}
