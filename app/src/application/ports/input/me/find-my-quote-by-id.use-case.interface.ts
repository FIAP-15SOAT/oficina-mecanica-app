import { Quote } from '@domain/entities/quote.entity';

export interface IFindMyQuoteByIdUseCase {
  execute(userId: string, quoteId: string): Promise<Quote>;
}
