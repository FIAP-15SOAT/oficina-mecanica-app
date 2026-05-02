import { Quote } from '@domain/entities/quote.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { IRepositories, IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class RejectQuoteUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) { }

  async execute(quoteId: string, notes?: string | null, userId?: string | null): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const { quote, workOrder } = await this.validateAndGetQuoteAndWorkOrder(repos, quoteId);

      await this.releaseStockReservations(repos, workOrder.id);
      return this.updateQuoteAndWorkOrder(repos, quote, workOrder, notes, userId);
    });
  }

  private async validateAndGetQuoteAndWorkOrder(repos: IRepositories, quoteId: string) {
    const quote = await repos.quote.findById(quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', quoteId);
    }

    quote.ensureCanReject();

    const workOrder = await repos.workOrder.findById(quote.workOrderId);

    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de Serviço', quote.workOrderId);
    }

    return { quote, workOrder };
  }

  private async releaseStockReservations(repos: IRepositories, workOrderId: string) {
    const reservations = await repos.stockReservation.findByWorkOrderId(workOrderId);

    await Promise.all(
      reservations.map((reservation: any) =>
        repos.partSupply.decrementReservedStock(reservation.partSupplyId, reservation.quantity),
      ),
    );

    await repos.stockReservation.deleteByWorkOrderId(workOrderId);
  }

  private async updateQuoteAndWorkOrder(
    repos: IRepositories,
    quote: Quote,
    workOrder: WorkOrder,
    notes?: string | null,
    userId?: string | null,
  ): Promise<Quote> {
    const previousStatus = workOrder.status;

    await this.updateQuote(repos, quote);
    await this.updateWorkOrder(repos, workOrder);
    await this.createStatusHistory(repos, workOrder.id, userId, previousStatus, notes, quote.id);

    const updatedQuote = await repos.quote.findById(quote.id);
    return updatedQuote!;
  }

  private async updateQuote(repos: IRepositories, quote: Quote) {
    quote.reject();
    await repos.quote.update(quote);
  }

  private async updateWorkOrder(repos: IRepositories, workOrder: WorkOrder) {
    workOrder.changeStatus(WorkOrderStatus.REJECTED);
    await repos.workOrder.update(workOrder);
  }

  private async createStatusHistory(
    repos: IRepositories,
    workOrderId: string,
    userId: string | null | undefined,
    previousStatus: WorkOrderStatus,
    notes: string | null | undefined,
    quoteId: string,
  ) {
    const history = StatusHistory.create({
      workOrderId: workOrderId,
      changedById: userId ?? null,
      previousStatus,
      newStatus: WorkOrderStatus.REJECTED,
      notes: notes ?? `Orçamento ${quoteId} rejeitado`,
    });

    await repos.statusHistory.create(history);
  }
}
