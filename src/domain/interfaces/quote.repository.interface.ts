import { Quote } from '../entities';
import { QuoteStatus } from '../enums';

export interface IQuoteRepository {
  create(quote: Quote): Promise<Quote>;
  findById(id: string): Promise<Quote | null>;
  findByWorkOrderId(workOrderId: string): Promise<Quote | null>;
  update(id: string, data: Partial<Quote>): Promise<Quote>;
  updateStatus(id: string, status: QuoteStatus): Promise<Quote>;
}
