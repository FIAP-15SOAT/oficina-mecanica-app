import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IFindWorkOrderQuotesUseCase } from '@application/ports/input/quote/find-work-order-quotes.use-case.interface';

export class FindWorkOrderQuotesUseCase implements IFindWorkOrderQuotesUseCase {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly workOrderRepository: IWorkOrderRepository,
  ) {}

  async execute(workOrderId: string): Promise<Quote[]> {
    const workOrder = await this.workOrderRepository.findById(workOrderId);

    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de Serviço', workOrderId);
    }

    return this.quoteRepository.findByWorkOrderId(workOrderId);
  }
}
