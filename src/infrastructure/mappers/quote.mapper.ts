import type {
  Quote as PrismaQuote,
  QuoteService as PrismaQuoteService,
  QuotePartSupply as PrismaQuotePartSupply,
} from '@generated/client';
import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuoteServiceMapper } from './quote-service.mapper';
import { QuotePartSupplyMapper } from './quote-part-supply.mapper';

export type PrismaQuoteWithItems = PrismaQuote & {
  services?: PrismaQuoteService[];
  parts?: PrismaQuotePartSupply[];
};

export class QuoteMapper {
  static toDomain(record: PrismaQuoteWithItems): Quote {
    const quote = Quote.reconstitute({
      id: record.id,
      workOrderId: record.workOrderId,
      servicesAmount: Number(record.servicesAmount),
      partsAmount: Number(record.partsAmount),
      totalAmount: Number(record.totalAmount),
      status: record.status as QuoteStatus,
      notes: record.notes ?? null,
      sentAt: record.sentAt ?? null,
      approvedAt: record.approvedAt ?? null,
      rejectedAt: record.rejectedAt ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    if (record.services) {
      quote.services = this.mapServicesToDomain(record.services);
    }

    if (record.parts) {
      quote.partsSupplies = this.mapPartsToDomain(record.parts);
    }

    return quote;
  }

  private static mapServicesToDomain(services: PrismaQuoteService[]) {
    return services.map((s) => QuoteServiceMapper.toDomain(s));
  }

  private static mapPartsToDomain(parts: PrismaQuotePartSupply[]) {
    return parts.map((p) => QuotePartSupplyMapper.toDomain(p));
  }
}
