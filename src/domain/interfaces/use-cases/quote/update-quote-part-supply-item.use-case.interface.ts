import { Quote } from '@domain/entities/quote.entity';
import { UpdateQuotePartSupplyQuantityDto } from './dto/update-quote-part-supply-item.dto';

export interface IUpdateQuotePartSupplyItemUseCase {
  execute(input: UpdateQuotePartSupplyQuantityDto): Promise<Quote>;
}
