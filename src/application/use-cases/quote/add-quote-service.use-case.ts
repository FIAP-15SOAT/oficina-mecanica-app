import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { AddQuoteServiceDto } from '@domain/interfaces/use-cases/quote/dto/add-quote-service.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class AddQuoteServiceUseCase {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly serviceRepository: IServiceRepository,
  ) {}

  async execute(dto: AddQuoteServiceDto): Promise<Quote> {
    const quote = await this.quoteRepository.findById(dto.quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', dto.quoteId);
    }

    const service = await this.serviceRepository.findById(dto.serviceId);

    if (!service) {
      throw new ResourceNotFoundException('Serviço', dto.serviceId);
    }

    const quoteService = quote.addService(service, dto.quantity);

    await this.quoteRepository.addServiceItem(quote, quoteService);

    return quote;
  }
}
