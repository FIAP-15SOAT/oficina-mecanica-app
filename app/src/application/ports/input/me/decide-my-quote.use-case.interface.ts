import { Quote } from '@domain/entities/quote.entity';
import { QuoteDecisionDto } from './dto/quote-decision.dto';

export interface IDecideMyQuoteUseCase {
  execute(userId: string, quoteId: string, input: QuoteDecisionDto): Promise<Quote>;
}
