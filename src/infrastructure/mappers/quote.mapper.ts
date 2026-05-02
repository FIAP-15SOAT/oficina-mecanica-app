import type { Quote as PrismaQuote } from '@generated/client';
import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';

export class QuoteMapper {
  static toDomain(record: PrismaQuote): Quote {
    return new Quote({
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
  }
}
