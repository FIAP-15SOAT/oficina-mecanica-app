import { Quote } from '../entities/quote.entity';
import { QuoteStatus } from '../enums/quote-status.enum';

export interface IQuoteRepository {
  create(quote: Quote): Promise<Quote>;
  findById(id: string): Promise<Quote | null>;
  findByWorkOrderId(workOrderId: string): Promise<Quote | null>;
  update(id: string, data: Partial<Quote>): Promise<Quote>;
  updateStatus(id: string, status: QuoteStatus): Promise<Quote>;
}
