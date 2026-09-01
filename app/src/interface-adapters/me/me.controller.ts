import { ChangeOwnPasswordUseCase } from '@application/use-cases/me/change-own-password.use-case';
import { GetMeUseCase } from '@application/use-cases/me/get-me.use-case';
import { ListMyWorkOrdersUseCase } from '@application/use-cases/me/list-my-work-orders.use-case';
import { GetMyWorkOrderUseCase } from '@application/use-cases/me/get-my-work-order.use-case';
import { ListMyWorkOrderQuotesUseCase } from '@application/use-cases/me/list-my-work-order-quotes.use-case';
import { GetMyQuoteUseCase } from '@application/use-cases/me/get-my-quote.use-case';
import { DecideMyQuoteUseCase } from '@application/use-cases/me/decide-my-quote.use-case';

import { ChangeOwnPasswordDto } from '@application/ports/input/me/dto/change-own-password.dto';
import { DecideMyQuoteDto } from '@application/ports/input/me/dto/decide-my-quote.dto';
import { AuthenticatedPrincipal } from '@application/ports/output/authenticated-principal';
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';

import { MePresenter } from './me.presenter';
import {
  MeDataResponse,
  MyWorkOrderDataResponse,
  MyWorkOrderPaginatedResponse,
  MyQuoteDataResponse,
  MyQuoteListResponse,
} from './responses/me.response';

export class MeController {
  constructor(
    private readonly changeOwnPasswordUseCase: ChangeOwnPasswordUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly listMyWorkOrdersUseCase: ListMyWorkOrdersUseCase,
    private readonly getMyWorkOrderUseCase: GetMyWorkOrderUseCase,
    private readonly listMyWorkOrderQuotesUseCase: ListMyWorkOrderQuotesUseCase,
    private readonly getMyQuoteUseCase: GetMyQuoteUseCase,
    private readonly decideMyQuoteUseCase: DecideMyQuoteUseCase,
  ) {}

  async changePassword(userId: string, input: ChangeOwnPasswordDto): Promise<void> {
    await this.changeOwnPasswordUseCase.execute(userId, input);
  }

  async getMe(principal: AuthenticatedPrincipal): Promise<MeDataResponse> {
    const result = await this.getMeUseCase.execute(principal);
    return MePresenter.toMeDataResponse(result);
  }

  async listWorkOrders(
    userId: string,
    pagination: PaginationInput,
    customerId?: string,
  ): Promise<MyWorkOrderPaginatedResponse> {
    const result = await this.listMyWorkOrdersUseCase.execute(userId, pagination, customerId);
    return MePresenter.toWorkOrderPaginatedResponse(result, pagination);
  }

  async getWorkOrder(userId: string, workOrderId: string): Promise<MyWorkOrderDataResponse> {
    const workOrder = await this.getMyWorkOrderUseCase.execute(userId, workOrderId);
    return MePresenter.toWorkOrderDataResponse(workOrder);
  }

  async listWorkOrderQuotes(userId: string, workOrderId: string): Promise<MyQuoteListResponse> {
    const quotes = await this.listMyWorkOrderQuotesUseCase.execute(userId, workOrderId);
    return MePresenter.toQuoteListResponse(quotes);
  }

  async getQuote(userId: string, quoteId: string): Promise<MyQuoteDataResponse> {
    const quote = await this.getMyQuoteUseCase.execute(userId, quoteId);
    return MePresenter.toQuoteDataResponse(quote);
  }

  async decideQuote(
    userId: string,
    quoteId: string,
    input: DecideMyQuoteDto,
  ): Promise<MyQuoteDataResponse> {
    const quote = await this.decideMyQuoteUseCase.execute(userId, quoteId, input);
    return MePresenter.toQuoteDataResponse(quote);
  }
}
