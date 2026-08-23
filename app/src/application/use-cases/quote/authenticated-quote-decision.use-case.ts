import { Quote } from '@domain/entities/quote.entity';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';

import { AuthenticatedQuoteDecisionDto } from '@application/ports/input/quote/dto/authenticated-quote-decision.dto';
import { ApproveQuoteUseCase } from './approve-quote.use-case';
import { RejectQuoteUseCase } from './reject-quote.use-case';

import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class AuthenticatedQuoteDecisionUseCase {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly workOrderRepository: IWorkOrderRepository,
    private readonly approveQuoteUseCase: ApproveQuoteUseCase,
    private readonly rejectQuoteUseCase: RejectQuoteUseCase,
  ) {}

  async execute(input: AuthenticatedQuoteDecisionDto): Promise<Quote> {
    const quote = await this.quoteRepository.findById(input.quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', input.quoteId);
    }

    const workOrder = await this.workOrderRepository.findById(quote.workOrderId);

    if (workOrder?.customerId !== input.customerId) {
      throw new UnauthorizedAccessException(
        'Orçamento não encontrado ou não pertence a este cliente',
      );
    }

    if (input.action === QuoteDecisionAction.APPROVE) {
      return this.approveQuoteUseCase.execute(input.quoteId);
    }

    return this.rejectQuoteUseCase.execute(input.quoteId, input.reason);
  }
}
