import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';

export interface UpdateQuoteStatusDto {
  status: QuoteStatus.APPROVED | QuoteStatus.REJECTED;
  reason?: string;
}

export interface IUpdateQuoteStatusUseCase {
  execute(quoteId: string, userId: string | null, dto: UpdateQuoteStatusDto): Promise<Quote>;
}
