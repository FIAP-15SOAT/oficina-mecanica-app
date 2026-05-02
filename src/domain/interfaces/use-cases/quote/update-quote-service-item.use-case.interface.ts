import { Quote } from '@domain/entities/quote.entity';
import { UpdateQuoteServiceQuantityDto } from './dto/update-quote-service-item.dto';

export interface IUpdateQuoteServiceItemUseCase {
  execute(input: UpdateQuoteServiceQuantityDto): Promise<Quote>;
}
