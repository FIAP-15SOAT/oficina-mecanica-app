import { Quote } from '@domain/entities/quote.entity';

export interface IFindMyWorkOrdersQuotesUseCase {
  execute(userId: string, workOrderId: string): Promise<Quote[]>;
}
