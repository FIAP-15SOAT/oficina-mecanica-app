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

    const workOrder = (await repos.workOrder.findById(quote.workOrderId))!;

    return { quote, workOrder };
  }

  private async validateStockAvailability(repos: IRepositories, partsSupplies: QuotePartSupply[]) {
    if (partsSupplies.length === 0) return;

    const partSupplyIds = partsSupplies.map((p) => p.partSupplyId);
    const partSupplies = await repos.partSupply.findByIds(partSupplyIds);

    for (const part of partsSupplies) {
      const partSupply = partSupplies.find((ps) => ps.id === part.partSupplyId)!;

      partSupply.ensureHasSufficientStock(part.quantity);
    }
  }

  private async createStockReservations(repos: IRepositories, workOrderId: string, partsSupplies: QuotePartSupply[]) {
    if (partsSupplies.length === 0) return;

    const reservations = partsSupplies.map((part) =>
      StockReservation.create({
        partSupplyId: part.partSupplyId,
        workOrderId: workOrderId,
        quantity: part.quantity,
      }),
    );

    await Promise.all([
      repos.stockReservation.createMany(reservations),
      ...partsSupplies.map((part) =>
        repos.partSupply.incrementReservedStock(part.partSupplyId, part.quantity),
      ),
    ]);
  }

  private async createWorkOrderItems(
    repos: IRepositories,
    workOrderId: string,
    services: QuoteService[],
    partsSupplies: QuotePartSupply[],
  ) {
    const workOrderServices = services.map((service) =>
      WorkOrderService.create({
        workOrderId: workOrderId,
        serviceId: service.serviceId,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
      }),
    );

    const workOrderPartSupplies = partsSupplies.map((partSupply) =>
      WorkOrderPartSupply.create({
        workOrderId: workOrderId,
        partSupplyId: partSupply.partSupplyId,
        quantity: partSupply.quantity,
        unitPrice: partSupply.unitPrice,
      }),
    );

    await Promise.all([
      repos.workOrderService.createMany(workOrderServices),
      repos.workOrderPartSupply.createMany(workOrderPartSupplies),
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
