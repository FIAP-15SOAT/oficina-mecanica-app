import type {
  Quote as PrismaQuote,
  QuoteService as PrismaQuoteService,
  QuotePartSupply as PrismaQuotePartSupply,
  Service as PrismaService,
  PartSupply as PrismaPartSupply,
  WorkOrder as PrismaWorkOrder,
  Customer as PrismaCustomer,
  Vehicle as PrismaVehicle,
  User as PrismaUser,
} from '@generated/client';
import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuoteServiceMapper } from './quote-service.mapper';
import { QuotePartSupplyMapper } from './quote-part-supply.mapper';
import { WorkOrderMapper } from './work-order.mapper';

type PrismaQuoteServiceWithRelation = PrismaQuoteService & { service?: PrismaService | null };

type PrismaQuotePartSupplyWithRelation = PrismaQuotePartSupply & {
  partSupply?: PrismaPartSupply | null;
};

type PrismaWorkOrderForQuote = PrismaWorkOrder & {
  customer?: PrismaCustomer | null;
  vehicle?: PrismaVehicle | null;
  assignedUser?: PrismaUser | null;
};

export type PrismaQuoteWithItems = PrismaQuote & {
  services?: PrismaQuoteServiceWithRelation[];
  partsSupplies?: PrismaQuotePartSupplyWithRelation[];
  workOrder?: PrismaWorkOrderForQuote | null;
};

export class QuoteMapper {
  static toDomain(record: PrismaQuoteWithItems): Quote {
    const quote = Quote.reconstitute({
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

    if (record.workOrder) {
      quote.workOrder = WorkOrderMapper.toDomain(record.workOrder);
    }

    return quote;
  }

  private static mapServicesToDomain(services: PrismaQuoteServiceWithRelation[]) {
    return services.map((s) => QuoteServiceMapper.toDomain(s));
  }

  private static mapPartsToDomain(parts: PrismaQuotePartSupplyWithRelation[]) {
    return parts.map((p) => QuotePartSupplyMapper.toDomain(p));
  }
}
