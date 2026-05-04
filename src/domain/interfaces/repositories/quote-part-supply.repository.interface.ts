import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';

export interface IQuotePartSupplyRepository {
  create(quotePartSupply: QuotePartSupply): Promise<QuotePartSupply>;
  update(quotePartSupply: QuotePartSupply): Promise<QuotePartSupply>;
  findOne(quoteId: string, partSupplyId: string): Promise<QuotePartSupply | null>;
  remove(quoteId: string, partSupplyId: string): Promise<void>;
  findByQuoteId(quoteId: string): Promise<QuotePartSupply[]>;
}
