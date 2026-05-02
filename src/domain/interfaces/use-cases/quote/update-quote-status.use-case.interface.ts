import { Quote } from '@domain/entities/quote.entity';

export interface UpdateQuoteStatusDto {
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
}

export interface IUpdateQuoteStatusUseCase {
  execute(quoteId: string, userId: string | null, dto: UpdateQuoteStatusDto): Promise<Quote>;
}
