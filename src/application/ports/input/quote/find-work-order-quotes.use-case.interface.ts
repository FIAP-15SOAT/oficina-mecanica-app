import { Quote } from '@domain/entities/quote.entity';

export abstract class IFindWorkOrderQuotesUseCase {
  abstract execute(workOrderId: string): Promise<Quote[]>;
}
