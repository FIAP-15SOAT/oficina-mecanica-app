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
  partsSupplies?: PrismaQuotePartSupply[];
};

export class QuoteMapper {
  static toDomain(record: PrismaQuoteWithItems): Quote {
    return Quote.reconstitute({
      id: record.id,
      workOrderId: record.workOrderId,
      servicesAmount: Number(record.servicesAmount),
      partsAmount: Number(record.partsAmount),
      totalAmount: Number(record.totalAmount),
      version: record.version,
      status: record.status as QuoteStatus,
      notes: record.notes ?? null,
      sentAt: record.sentAt ?? null,
      approvedAt: record.approvedAt ?? null,
      rejectedAt: record.rejectedAt ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      services: record.services ? this.mapServicesToDomain(record.services) : undefined,
      partsSupplies: record.partsSupplies ? this.mapPartsToDomain(record.partsSupplies) : undefined,
    });
  }

  private static mapServicesToDomain(services: PrismaQuoteService[]) {
    return services.map((s) => QuoteServiceMapper.toDomain(s));
  }

  private static mapPartsToDomain(parts: PrismaQuotePartSupply[]) {
    return parts.map((p) => QuotePartSupplyMapper.toDomain(p));
  }
}
