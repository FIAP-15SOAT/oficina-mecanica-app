import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { CustomerAccessPolicy } from '@application/policies/customer-access.policy';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class GetMyQuoteUseCase {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly workOrderRepository: IWorkOrderRepository,
    private readonly customerAccessPolicy: CustomerAccessPolicy,
  ) {}

  async execute(userId: string, quoteId: string): Promise<Quote> {
    const quote = await this.quoteRepository.findByIdWithDetails(quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', quoteId);
    }

    const workOrder = await this.workOrderRepository.findById(quote.workOrderId);

    if (!workOrder) {
      throw new ResourceNotFoundException('Orçamento', quoteId);
    }

    await this.customerAccessPolicy.assertCustomerAuthorized(userId, workOrder.customerId);

    return quote;
  }
}
