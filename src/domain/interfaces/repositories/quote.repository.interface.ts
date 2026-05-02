import { Quote } from '../../entities/quote.entity';
import { QuoteStatus } from '../../enums/quote-status.enum';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '../common/pagination.interface';

export interface QuoteFilters extends PaginationInput {
  workOrderId?: string;
  status?: QuoteStatus;
}

export interface IQuoteRepository {
  create(quote: Quote): Promise<Quote>;
  findById(id: string): Promise<Quote | null>;
  findByWorkOrderId(workOrderId: string): Promise<Quote[]>;
  findPendingByWorkOrderId(workOrderId: string): Promise<Quote[]>;
  findApprovedByWorkOrderId(workOrderId: string): Promise<Quote | null>;
  update(quote: Quote): Promise<Quote>;
  rejectPendingByWorkOrderId(workOrderId: string): Promise<void>;
  findAllPaginated(filters: QuoteFilters): Promise<PaginatedRepositoryResult<Quote>>;
}
