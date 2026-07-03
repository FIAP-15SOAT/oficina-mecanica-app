import { Quote } from '@domain/entities/quote.entity';

export interface IRejectQuoteUseCase {
  execute(quoteId: string, notes?: string | null, userId?: string | null): Promise<Quote>;
}
