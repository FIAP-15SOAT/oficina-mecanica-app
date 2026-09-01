import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

export interface DecideMyQuoteDto {
  action: QuoteDecisionAction;
  reason?: string | null;
}
