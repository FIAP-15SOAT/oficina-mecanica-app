import { Quote } from '@domain/entities/quote.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { IRepositories, IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class ApproveQuoteUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) { }

  async execute(quoteId: string, userId?: string | null): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const { quote, workOrder } = await this.validateAndGetQuoteAndWorkOrder(repos, quoteId);

      const [partsSupplies, services] = await Promise.all([
        repos.quotePartSupply.findByQuoteId(quoteId),
        repos.quoteService.findByQuoteId(quoteId),
      ]);

      await this.validateStockAvailability(repos, partsSupplies);

      await Promise.all([
        this.createStockReservations(repos, workOrder.id, partsSupplies),
        this.createWorkOrderItems(repos, workOrder.id, services, partsSupplies),
      ]);

      return this.updateQuoteAndWorkOrder(repos, quote, workOrder, userId);
    });
  }

  private async validateAndGetQuoteAndWorkOrder(repos: IRepositories, quoteId: string) {
    const quote = await repos.quote.findById(quoteId);
    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', quoteId);
    }

    quote.ensureCanApprove();

    const workOrder = await repos.workOrder.findById(quote.workOrderId);
    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de Serviço', quote.workOrderId);
    }

    return { quote, workOrder };
  }

  private async validateStockAvailability(repos: IRepositories, partsSupplies: QuotePartSupply[]) {
    for (const part of partsSupplies) {
      const partSupply = await repos.partSupply.findById(part.partSupplyId);

      if (!partSupply) {
        throw new ResourceNotFoundException('Peça/Insumo', part.partSupplyId);
      }

      partSupply.ensureHasSufficientStock(part.quantity);
    }
  }

  private async createStockReservations(repos: IRepositories, workOrderId: string, partsSupplies: QuotePartSupply[]) {
    for (const part of partsSupplies) {
      const reservation = StockReservation.create({
        partSupplyId: part.partSupplyId,
        workOrderId: workOrderId,
        quantity: part.quantity,
      });

      await repos.stockReservation.create(reservation);
      await repos.partSupply.incrementReservedStock(part.partSupplyId, part.quantity);
    }
  }

  private async createWorkOrderItems(
    repos: IRepositories,
    workOrderId: string,
    services: QuoteService[],
    partsSupplies: QuotePartSupply[],
  ) {
    await Promise.all([
      ...services.map((service) => {
        const wos = WorkOrderService.create({
          workOrderId: workOrderId,
          serviceId: service.serviceId,
          quantity: service.quantity,
          unitPrice: service.unitPrice,
        });

        return repos.workOrderService.create(wos);
      }),
      ...partsSupplies.map((partSupply) => {
        const wops = WorkOrderPartSupply.create({
          workOrderId: workOrderId,
          partSupplyId: partSupply.partSupplyId,
          quantity: partSupply.quantity,
          unitPrice: partSupply.unitPrice,
        });

        return repos.workOrderPartSupply.create(wops);
      }),
    ]);
  }

  private async updateQuoteAndWorkOrder(
    repos: IRepositories,
    quote: Quote,
    workOrder: WorkOrder,
    userId?: string | null,
  ): Promise<Quote> {
    const previousStatus = workOrder.status;

    await this.updateQuote(repos, quote, workOrder.id);
    await this.updateWorkOrder(repos, workOrder, quote.totalAmount);
    await this.createStatusHistory(repos, workOrder.id, userId, previousStatus);

    const updatedQuote = await repos.quote.findById(quote.id);
    return updatedQuote!;
  }

  private async updateQuote(repos: IRepositories, quote: Quote, workOrderId: string) {
    quote.approve();
    await repos.quote.update(quote);
    await repos.quote.rejectPendingByWorkOrderId(workOrderId);
  }

  private async updateWorkOrder(repos: IRepositories, workOrder: WorkOrder, totalAmount: number) {
    workOrder.changeStatus(WorkOrderStatus.APPROVED);
    workOrder.totalAmount = totalAmount;
    await repos.workOrder.update(workOrder);
  }

  private async createStatusHistory(
    repos: IRepositories,
    workOrderId: string,
    userId?: string | null,
    previousStatus?: WorkOrderStatus,
  ) {
    const history = StatusHistory.create({
      workOrderId: workOrderId,
      changedById: userId ?? null,
      previousStatus: previousStatus!,
      newStatus: WorkOrderStatus.APPROVED,
      notes: null,
    });

    await repos.statusHistory.create(history);
  }
}
