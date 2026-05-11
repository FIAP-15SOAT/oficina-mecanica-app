import { Quote } from '@domain/entities/quote.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { AddQuoteServiceDto } from '@domain/interfaces/use-cases/quote/dto/add-quote-service.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class AddQuoteServiceUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(dto: AddQuoteServiceDto): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findByIdWithDetails(dto.quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', dto.quoteId);
      }

      const service = await repos.service.findById(dto.serviceId);

      if (!service) {
        throw new ResourceNotFoundException('Serviço', dto.serviceId);
      }

      const item = quote.addService(service, dto.quantity);

      await repos.quote.addServiceItem(item);
      return repos.quote.update(quote);
    });
  }
}
