import type {
  QuotePartSupply as PrismaQuotePartSupply,
  PartSupply as PrismaPartSupply,
} from '@generated/client';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { PartSupplyMapper } from './part-supply.mapper';

type PrismaQuotePartSupplyWithRelation = PrismaQuotePartSupply & {
  partSupply?: PrismaPartSupply | null;
};

export class QuotePartSupplyMapper {
  static toDomain(record: PrismaQuotePartSupplyWithRelation): QuotePartSupply {
    const item = QuotePartSupply.reconstitute({
      quoteId: record.quoteId,
      partSupplyId: record.partSupplyId,
      quantity: record.quantity,
      unitPrice: Number(record.unitPrice),
      totalPrice: Number(record.totalPrice),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    if (record.partSupply) {
      item.partSupply = PartSupplyMapper.toDomain(record.partSupply);
    }

    return item;
  }
}
