import { Quote } from '@domain/entities/quote.entity';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { CustomerAccessPolicy } from '@application/policies/customer-access.policy';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class ListMyWorkOrderQuotesUseCase {
  constructor(
    private readonly workOrderRepository: IWorkOrderRepository,
    private readonly quoteRepository: IQuoteRepository,
    private readonly customerAccessPolicy: CustomerAccessPolicy,
  ) {}

  async execute(userId: string, workOrderId: string): Promise<Quote[]> {
    const workOrder = await this.workOrderRepository.findById(workOrderId);

    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de Serviço', workOrderId);
    }

    await this.customerAccessPolicy.assertCustomerAuthorized(userId, workOrder.customerId);

    return this.quoteRepository.findByWorkOrderId(workOrderId);
  }
}
