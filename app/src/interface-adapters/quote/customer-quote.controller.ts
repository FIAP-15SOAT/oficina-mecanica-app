import { IFindPendingQuotesForCustomerUseCase } from '@application/ports/input/quote/find-pending-quotes-for-customer.use-case.interface';
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { QuotePresenter } from './quote.presenter';
import { QuotePaginatedResponse } from './responses/quote.response';

export class CustomerQuoteController {
  constructor(
    private readonly findPendingQuotesForCustomerUseCase: IFindPendingQuotesForCustomerUseCase,
  ) {}

  async findMyPending(
    customerId: string,
    pagination: PaginationInput,
  ): Promise<QuotePaginatedResponse> {
    const result = await this.findPendingQuotesForCustomerUseCase.execute(customerId, pagination);
    return QuotePresenter.toPaginatedResponse(result);
  }
}
