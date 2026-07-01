import { Quote } from '@domain/entities/quote.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { FindAllQuotesPaginatedInput } from './dto/find-all-quotes-paginated.dto';

export abstract class IFindAllQuotesPaginatedUseCase {
  abstract execute(filters: FindAllQuotesPaginatedInput): Promise<PaginatedResult<Quote>>;
}
