import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { AddQuotePartSupplyDto } from '@domain/interfaces/use-cases/quote/dto/add-quote-part-supply.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class AddQuotePartSupplyUseCase {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly partSupplyRepository: IPartSupplyRepository,
  ) {}

  async execute(dto: AddQuotePartSupplyDto): Promise<Quote> {
    const quote = await this.quoteRepository.findById(dto.quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', dto.quoteId);
    }

    const partSupply = await this.partSupplyRepository.findById(dto.partSupplyId);

    if (!partSupply) {
      throw new ResourceNotFoundException('Peça/Insumo', dto.partSupplyId);
    }

    const item = quote.addPartSupply(partSupply, dto.quantity);

    await this.quoteRepository.addPartSupplyItem(quote, item);

    return quote;
  }
}
