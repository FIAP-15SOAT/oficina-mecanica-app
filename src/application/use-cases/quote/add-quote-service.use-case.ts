import { Quote } from '@domain/entities/quote.entity';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { AddQuoteServiceDto } from '@domain/interfaces/use-cases/quote/dto/add-quote-service.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class AddQuoteServiceUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) { }

  async execute(dto: AddQuoteServiceDto): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findById(dto.quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', dto.quoteId);
      }

      quote.ensureCanChangeItems();

      const service = await repos.service.findById(dto.serviceId);

      if (!service) {
        throw new ResourceNotFoundException('Serviço', dto.serviceId);
      }

      const existing = await repos.quoteService.findOne(dto.quoteId, dto.serviceId);

      if (existing) {
        throw new ResourceConflictException(`Serviço já adicionado ao orçamento.`);
      }

      const quoteService = QuoteService.create({
        quoteId: dto.quoteId,
        serviceId: dto.serviceId,
        quantity: dto.quantity,
        unitPrice: service.basePrice,
      });

      await repos.quoteService.create(quoteService);

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
