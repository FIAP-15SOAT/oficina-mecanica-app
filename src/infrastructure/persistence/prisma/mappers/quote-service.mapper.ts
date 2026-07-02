import type {
  QuoteService as PrismaQuoteService,
  Service as PrismaService,
} from '@generated/client';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { ServiceMapper } from './service.mapper';

type PrismaQuoteServiceWithRelation = PrismaQuoteService & { service?: PrismaService | null };

export class QuoteServiceMapper {
  static toDomain(record: PrismaQuoteServiceWithRelation): QuoteService {
    const item = QuoteService.reconstitute({
      quoteId: record.quoteId,
      serviceId: record.serviceId,
      quantity: record.quantity,
      unitPrice: Number(record.unitPrice),
      totalPrice: Number(record.totalPrice),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    if (record.service) {
      item.service = ServiceMapper.toDomain(record.service);
    }

    return item;
  }
}
