import { IFindPendingQuotesForCustomerUseCase } from '@application/ports/input/quote/find-pending-quotes-for-customer.use-case.interface';
import { AuthenticatedQuoteDecisionUseCase } from '@application/use-cases/quote/authenticated-quote-decision.use-case';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { QuotePresenter } from './quote.presenter';
import { QuoteDataResponse, QuotePaginatedResponse } from './responses/quote.response';

export class CustomerQuoteController {
  constructor(
    private readonly findPendingQuotesForCustomerUseCase: IFindPendingQuotesForCustomerUseCase,
    private readonly authenticatedQuoteDecisionUseCase: AuthenticatedQuoteDecisionUseCase,
  ) {}

  async findMyPending(
    customerId: string,
    pagination: PaginationInput,
  ): Promise<QuotePaginatedResponse> {
    const result = await this.findPendingQuotesForCustomerUseCase.execute(customerId, pagination);
    return QuotePresenter.toPaginatedResponse(result);
  }

  async decide(
    quoteId: string,
    customerId: string,
    input: { action: QuoteDecisionAction; reason?: string },
  ): Promise<QuoteDataResponse> {
    const quote = await this.authenticatedQuoteDecisionUseCase.execute({
      quoteId,
      customerId,
      action: input.action,
      reason: input.reason,
    });
    return QuotePresenter.toDataResponse(quote);
  }
}
