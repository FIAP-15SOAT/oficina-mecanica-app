import { Quote } from '@domain/entities/quote.entity';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { WorkOrderPresenter } from '@interface-adapters/work-order/work-order.presenter';

import {
  QuoteResponse,
  QuoteListResponse,
  QuotePaginatedResponse,
  QuoteDataResponse,
  QuoteWithItemsDataResponse,
  QuoteWithItemsResponse,
  QuoteServiceItemResponse,
  QuotePartSupplyItemResponse,
} from './responses/quote.response';

export class QuotePresenter {
  static toResponse(quote: Quote): QuoteResponse {
    return {
      id: quote.id,
      workOrder: WorkOrderPresenter.toSummaryResponse(quote.workOrder!),
      status: quote.status,
      notes: quote.notes,
      sentAt: quote.sentAt,
      approvedAt: quote.approvedAt,
      rejectedAt: quote.rejectedAt,
      servicesAmount: quote.servicesAmount,
      partsAmount: quote.partsAmount,
      totalAmount: quote.totalAmount,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
    };
  }

  static toWithItemsResponse(quote: Quote): QuoteWithItemsDataResponse {
    return {
      data: QuotePresenter.toWithItemsDto(quote),
    };
  }

  private static toWithItemsDto(quote: Quote): QuoteWithItemsResponse {
    return {
      ...QuotePresenter.toResponse(quote),
      services: quote.services.map(QuotePresenter.toServiceItem),
      partsSupplies: quote.partsSupplies.map(QuotePresenter.toPartSupplyItem),
    };
  }

  private static toServiceItem(this: void, item: QuoteService): QuoteServiceItemResponse {
    return {
      id: item.serviceId,
      name: item.service!.name,
      description: item.service!.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private static toPartSupplyItem(this: void, item: QuotePartSupply): QuotePartSupplyItemResponse {
    return {
      id: item.partSupplyId,
      name: item.partSupply!.name,
      description: item.partSupply!.description,
      sku: item.partSupply!.sku,
      partNumber: item.partSupply!.partNumber ?? null,
      category: item.partSupply!.category,
      unit: item.partSupply!.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  static toDataResponse(quote: Quote): QuoteDataResponse {
    return { data: QuotePresenter.toResponse(quote) };
  }

  static toListResponse(quotes: Quote[]): QuoteListResponse {
    return {
      data: quotes.map((q) => QuotePresenter.toResponse(q)),
    };
  }

  static toPaginatedResponse(paginatedResult: PaginatedResult<Quote>): QuotePaginatedResponse {
    const { items, pagination } = paginatedResult;
    return {
      data: items.map((q) => QuotePresenter.toResponse(q)),
      pagination,
    };
  }
}
