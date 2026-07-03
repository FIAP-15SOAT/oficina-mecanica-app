import { Quote } from '@domain/entities/quote.entity';

export interface IEmailDecisionQuoteUseCase {
  execute(quoteId: string, token: string): Promise<Quote>;
}
