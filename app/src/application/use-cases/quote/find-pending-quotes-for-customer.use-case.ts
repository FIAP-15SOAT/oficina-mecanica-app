import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { IFindPendingQuotesForCustomerUseCase } from '@application/ports/input/quote/find-pending-quotes-for-customer.use-case.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';

export class FindPendingQuotesForCustomerUseCase implements IFindPendingQuotesForCustomerUseCase {
  constructor(private readonly quoteRepository: IQuoteRepository) {}

  async execute(customerId: string, pagination: PaginationInput): Promise<PaginatedResult<Quote>> {
    const result = await this.quoteRepository.findAllPaginated(pagination, {
      customerId,
      status: QuoteStatus.SENT,
    });

    return buildPaginatedResult(result, pagination);
  }
}
