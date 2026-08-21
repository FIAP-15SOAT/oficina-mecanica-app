import { Quote } from '@domain/entities/quote.entity';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';

export interface IFindPendingQuotesForCustomerUseCase {
  execute(customerId: string, pagination: PaginationInput): Promise<PaginatedResult<Quote>>;
}
