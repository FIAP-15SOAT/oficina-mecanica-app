import { ICreateWorkOrderUseCase } from '@application/ports/input/work-order/create-work-order.use-case.interface';
import { IFindWorkOrderByIdUseCase } from '@application/ports/input/work-order/find-work-order-by-id.use-case.interface';
import { IFindAllWorkOrdersPaginatedUseCase } from '@application/ports/input/work-order/find-all-work-orders-paginated.use-case.interface';
import { IUpdateWorkOrderUseCase } from '@application/ports/input/work-order/update-work-order.use-case.interface';
import { IUpdateWorkOrderStatusUseCase } from '@application/ports/input/work-order/update-work-order-status.use-case.interface';
import { IUpdateWorkOrderServiceStatusUseCase } from '@application/ports/input/work-order/update-work-order-service-status.use-case.interface';
import { IFindWorkOrderStatusHistoryUseCase } from '@application/ports/input/work-order/find-work-order-status-history.use-case.interface';
import { IFindWorkOrderQuotesUseCase } from '@application/ports/input/quote/find-work-order-quotes.use-case.interface';

import { CreateWorkOrderRequest } from './requests/create-work-order-request';
import { UpdateWorkOrderRequest } from './requests/update-work-order-request';
import { FindAllWorkOrdersQuery } from './requests/find-all-work-orders-query';
import { UpdateWorkOrderStatusRequest } from './requests/update-work-order-status-request';
import { UpdateWorkOrderServiceStatusRequest } from './requests/update-work-order-service-status-request';

import { WorkOrderPresenter } from './work-order.presenter';
import {
  WorkOrderDataResponse,
  WorkOrderPaginatedResponse,
  WorkOrderServiceItemDataResponse,
} from './responses/work-order.response';
import { StatusHistoryListResponse } from './responses/status-history.response';

import { QuotePresenter } from '@interface-adapters/quote/quote.presenter';
import { QuoteListResponse } from '@interface-adapters/quote/responses/quote.response';

export class WorkOrderController {
  constructor(
    private readonly createWorkOrderUseCase: ICreateWorkOrderUseCase,
    private readonly findWorkOrderByIdUseCase: IFindWorkOrderByIdUseCase,
    private readonly findAllWorkOrdersPaginatedUseCase: IFindAllWorkOrdersPaginatedUseCase,
    private readonly updateWorkOrderUseCase: IUpdateWorkOrderUseCase,
    private readonly updateWorkOrderStatusUseCase: IUpdateWorkOrderStatusUseCase,
    private readonly updateWorkOrderServiceStatusUseCase: IUpdateWorkOrderServiceStatusUseCase,
    private readonly findWorkOrderStatusHistoryUseCase: IFindWorkOrderStatusHistoryUseCase,
    private readonly findWorkOrderQuotesUseCase: IFindWorkOrderQuotesUseCase,
  ) {}

  async create(input: CreateWorkOrderRequest, userId: string): Promise<WorkOrderDataResponse> {
    const workOrder = await this.createWorkOrderUseCase.execute({ ...input, userId });
    return WorkOrderPresenter.toDataResponse(workOrder);
  }

  async findAll(
    query: FindAllWorkOrdersQuery,
    accessibleCustomerIds?: string[],
  ): Promise<WorkOrderPaginatedResponse> {
    const result = await this.findAllWorkOrdersPaginatedUseCase.execute({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      ...(accessibleCustomerIds !== undefined && { customerIdIn: accessibleCustomerIds }),
    });

    return WorkOrderPresenter.toPaginatedResponse(result);
  }

  async findOne(id: string, accessibleCustomerIds?: string[]): Promise<WorkOrderDataResponse> {
    const workOrder = await this.findWorkOrderByIdUseCase.execute(id, accessibleCustomerIds);
    return WorkOrderPresenter.toDataResponse(workOrder);
  }

  async update(
    id: string,
    input: UpdateWorkOrderRequest,
    userId: string,
  ): Promise<WorkOrderDataResponse> {
    const workOrder = await this.updateWorkOrderUseCase.execute(id, { ...input, userId });
    return WorkOrderPresenter.toDataResponse(workOrder);
  }

  async updateStatus(
    id: string,
    input: UpdateWorkOrderStatusRequest,
    userId: string,
  ): Promise<WorkOrderDataResponse> {
    const workOrder = await this.updateWorkOrderStatusUseCase.execute(id, {
      status: input.status,
      notes: input.notes,
      userId,
    });
    return WorkOrderPresenter.toDataResponse(workOrder);
  }

  async updateServiceStatus(
    workOrderId: string,
    serviceId: string,
    input: UpdateWorkOrderServiceStatusRequest,
    userId: string,
  ): Promise<WorkOrderServiceItemDataResponse> {
    const result = await this.updateWorkOrderServiceStatusUseCase.execute({
      workOrderId,
      serviceId,
      status: input.status,
      userId,
    });

    return WorkOrderPresenter.toServiceItemDataResponse(result);
  }

  async getStatusHistory(id: string): Promise<StatusHistoryListResponse> {
    const history = await this.findWorkOrderStatusHistoryUseCase.execute(id);
    return WorkOrderPresenter.toStatusHistoryListResponse(history);
  }

  async findQuotes(workOrderId: string): Promise<QuoteListResponse> {
    const quotes = await this.findWorkOrderQuotesUseCase.execute(workOrderId);
    return QuotePresenter.toListResponse(quotes);
  }
}
