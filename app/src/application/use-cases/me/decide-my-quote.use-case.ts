import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { CustomerAccessPolicy } from '@application/policies/customer-access.policy';
import { IUpdateQuoteStatusUseCase } from '@application/ports/input/quote/update-quote-status.use-case.interface';

import { DecideMyQuoteDto } from '@application/ports/input/me/dto/decide-my-quote.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class DecideMyQuoteUseCase {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly workOrderRepository: IWorkOrderRepository,
    private readonly customerAccessPolicy: CustomerAccessPolicy,
    private readonly updateQuoteStatusUseCase: IUpdateQuoteStatusUseCase,
  ) {}

  async execute(userId: string, quoteId: string, dto: DecideMyQuoteDto): Promise<Quote> {
    const quote = await this.quoteRepository.findById(quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', quoteId);
    }

    const workOrder = await this.workOrderRepository.findById(quote.workOrderId);

    if (!workOrder) {
      throw new ResourceNotFoundException('Orçamento', quoteId);
    }

    await this.customerAccessPolicy.assertCustomerAuthorized(userId, workOrder.customerId);

    const status =
      dto.action === QuoteDecisionAction.APPROVE ? QuoteStatus.APPROVED : QuoteStatus.REJECTED;

    return this.updateQuoteStatusUseCase.execute(quoteId, userId, {
      status,
      reason: dto.reason ?? null,
    });
  }
}
