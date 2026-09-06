import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

export interface QuoteDecisionDto {
  action: QuoteDecisionAction;
  reason?: string | null;
}
