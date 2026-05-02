import { Quote } from '@domain/entities/quote.entity';

export interface IEmailDecisionQuoteUseCase {
  execute(quoteId: string, action: string, token: string): Promise<Quote>;
}
