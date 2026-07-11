import { Quote } from '@domain/entities/quote.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { QuoteStatus } from '@domain/enums/quote-status.enum';

import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class RejectQuoteUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(quoteId: string, notes?: string | null, userId?: string | null): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findById(quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', quoteId);
      }

      quote.reject();

      const workOrder = (await repos.workOrder.findById(quote.workOrderId))!;
      const workOrderQuotes = await repos.quote.findByWorkOrderId(workOrder.id);

      const hasOtherSentQuote = workOrderQuotes.some(
        (sibling) => sibling.id !== quote.id && sibling.status === QuoteStatus.SENT,
      );

      if (hasOtherSentQuote) {
        return repos.quote.update(quote);
      }

      const previousStatus = workOrder.status;

      workOrder.changeStatus(WorkOrderStatus.REJECTED);

      const [updatedQuote] = await Promise.all([
        repos.quote.update(quote),
        repos.workOrder.update(workOrder),
        repos.statusHistory.create(
          StatusHistory.create({
            workOrderId: workOrder.id,
            changedById: userId ?? null,
            previousStatus,
            newStatus: WorkOrderStatus.REJECTED,
            notes: notes ?? `Orçamento ${quoteId} rejeitado`,
          }),
        ),
      ]);

      return updatedQuote;
    });
  }
}
