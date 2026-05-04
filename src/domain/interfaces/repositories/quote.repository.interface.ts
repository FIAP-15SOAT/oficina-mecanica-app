import { Quote } from '../../entities/quote.entity';
import { QuoteStatus } from '../../enums/quote-status.enum';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '../common/pagination.interface';

export interface QuoteFilters {
  workOrderId?: string;
  status?: QuoteStatus;
}

export interface IQuoteRepository {
  create(quote: Quote): Promise<Quote>;
  findById(id: string): Promise<Quote | null>;
  findByWorkOrderId(workOrderId: string): Promise<Quote[]>;
  update(quote: Quote): Promise<Quote>;
  rejectPendingByWorkOrderId(workOrderId: string): Promise<void>;
  findAllPaginated(
    pagination: PaginationInput,
    filters: QuoteFilters,
  ): Promise<PaginatedRepositoryResult<Quote>>;
}
