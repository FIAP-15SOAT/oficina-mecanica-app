import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { CreateQuoteDto } from '@domain/interfaces/use-cases/quote/dto/create-quote.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class CreateQuoteUseCase {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly workOrderRepository: IWorkOrderRepository,
  ) {}

  async execute(dto: CreateQuoteDto): Promise<Quote> {
    const workOrder = await this.workOrderRepository.findById(dto.workOrderId);

    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de Serviço', dto.workOrderId);
    }

    workOrder.ensureCanCreateQuote();

    const quote = Quote.create({
      workOrderId: dto.workOrderId,
      notes: dto.notes,
    });

    return this.quoteRepository.create(quote);
  }
}
