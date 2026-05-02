import { Quote } from '@domain/entities/quote.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { UpdateQuoteServiceQuantityDto } from '@domain/interfaces/use-cases/quote/dto/update-quote-service-item.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateQuoteServiceQuantityUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(dto: UpdateQuoteServiceQuantityDto): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findById(dto.quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', dto.quoteId);
      }

      quote.ensureCanChangeItems();

      const existing = await repos.quoteService.findOne(dto.quoteId, dto.serviceId);

      if (!existing) {
        throw new ResourceNotFoundException('Serviço no orçamento', dto.serviceId);
      }

      existing.updateQuantity(dto.quantity);


      await repos.quoteService.update(existing);

      const [allServices, allParts] = await Promise.all([
        repos.quoteService.findByQuoteId(dto.quoteId),
        repos.quotePartSupply.findByQuoteId(dto.quoteId),
      ]);

      quote.services = allServices;
      quote.partsSupplies = allParts;
      quote.recalculateTotals();

      return repos.quote.update(quote);
    });
  }
}

