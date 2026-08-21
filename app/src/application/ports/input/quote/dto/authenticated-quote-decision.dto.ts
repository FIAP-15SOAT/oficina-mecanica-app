import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

export interface AuthenticatedQuoteDecisionDto {
  quoteId: string;
  customerId: string;
  action: QuoteDecisionAction;
  reason?: string;
}
