import { Quote } from '@domain/entities/quote.entity';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { WorkOrderPresenter } from '@presentation/work-order/work-order.presenter';
import {
  QuoteResponseDto,
  QuoteListResponseDto,
  QuotePaginatedResponseDto,
  QuoteDataResponseDto,
  QuoteWithItemsDataResponseDto,
  QuoteWithItemsResponseDto,
  QuoteServiceItemResponseDto,
  QuotePartSupplyItemResponseDto,
} from './dto/quote-response.dto';

export class QuotePresenter {
  static toResponse(quote: Quote): QuoteResponseDto {
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

  static toWithItemsResponse(quote: Quote): QuoteWithItemsDataResponseDto {
    return {
      data: QuotePresenter.toWithItemsDto(quote),
    };
  }

  private static toWithItemsDto(quote: Quote): QuoteWithItemsResponseDto {
    return {
      ...QuotePresenter.toResponse(quote),
      services: quote.services!.map(QuotePresenter.toServiceItem),
      partsSupplies: quote.partsSupplies!.map(QuotePresenter.toPartSupplyItem),
    };
  }

  private static toServiceItem(this: void, item: QuoteService): QuoteServiceItemResponseDto {
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

  private static toPartSupplyItem(
    this: void,
    item: QuotePartSupply,
  ): QuotePartSupplyItemResponseDto {
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

  static toDataResponse(quote: Quote): QuoteDataResponseDto {
    return { data: QuotePresenter.toResponse(quote) };
  }

  static toListResponse(quotes: Quote[]): QuoteListResponseDto {
    return {
      data: quotes.map((q) => QuotePresenter.toResponse(q)),
    };
  }

  static toPaginatedResponse(paginatedResult: PaginatedResult<Quote>): QuotePaginatedResponseDto {
    const { items, pagination } = paginatedResult;
    return {
      data: items.map((q) => QuotePresenter.toResponse(q)),
      pagination,
    };
  }
}
