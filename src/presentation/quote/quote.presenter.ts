import { Quote } from '@domain/entities/quote.entity';
import {
  QuoteDataResponseDto,
  QuoteResponseDto,
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
}
