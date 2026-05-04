import { Quote } from '@domain/entities/quote.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  QuoteResponseDto,
  QuoteListResponseDto,
  QuotePaginatedResponseDto,
  QuoteDataResponseDto,
  QuoteWithItemsDataResponseDto,
} from './dto/quote-response.dto';

export class QuotePresenter {
  static toResponse(quote: Quote): QuoteResponseDto {
    return {
      id: quote.id,
      workOrderId: quote.workOrderId,
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
      data: {
        ...QuotePresenter.toResponse(quote),
        services: quote.services ?? [],
        partsSupplies: quote.partsSupplies ?? [],
      },
    };
  }

  static toDataResponse(quote: Quote): QuoteDataResponseDto {
    return { data: QuotePresenter.toResponse(quote) };
  }

  static toListResponse(quotes: Quote[]): QuoteListResponseDto {
    return {
      data: quotes.map((q) => QuotePresenter.toWithItemsResponse(q).data),
    };
  }

  static toPaginatedResponse(paginatedResult: PaginatedResult<Quote>): QuotePaginatedResponseDto {
    const { items, pagination } = paginatedResult;
    return {
      data: items.map((q) => QuotePresenter.toWithItemsResponse(q).data),
      pagination,
    };
  }
}
