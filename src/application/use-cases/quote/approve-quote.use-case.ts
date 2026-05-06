import { Quote } from '@domain/entities/quote.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { IRepositories, IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class ApproveQuoteUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(quoteId: string, userId?: string | null): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findById(quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', quoteId);
      }

      quote.approve();

      const workOrder = (await repos.workOrder.findById(quote.workOrderId))!;

      const partsSupplies = quote.partsSupplies ?? [];
      const services = quote.services ?? [];

      await this.validateStockAvailability(repos, partsSupplies);

      const previousStatus = workOrder.status;

      workOrder.changeStatus(WorkOrderStatus.APPROVED);
      workOrder.totalAmount = quote.totalAmount;

      await Promise.all([
        this.createStockReservations(repos, workOrder.id, partsSupplies),
        this.createWorkOrderItems(repos, workOrder.id, services, partsSupplies),
        repos.quote.update(quote),
        repos.quote.rejectPendingByWorkOrderId(workOrder.id),
        repos.workOrder.update(workOrder),
        repos.statusHistory.create(
          StatusHistory.create({
            workOrderId: workOrder.id,
            changedById: userId ?? null,
            previousStatus,
            newStatus: WorkOrderStatus.APPROVED,
            notes: null,
          }),
        ),
      ]);

      return quote;
    });
  }

  private async validateStockAvailability(
    repos: IRepositories,
    partsSupplies: QuotePartSupply[],
  ): Promise<void> {
    if (partsSupplies.length === 0) return;

    const partSupplyIds = partsSupplies.map((p) => p.partSupplyId);
    const partSupplies = await repos.partSupply.findByIds(partSupplyIds);

    for (const part of partsSupplies) {
      const partSupply = partSupplies.find((ps) => ps.id === part.partSupplyId)!;
      partSupply.ensureHasSufficientStock(part.quantity);
    }
  }

  private async createStockReservations(
    repos: IRepositories,
    workOrderId: string,
    partsSupplies: QuotePartSupply[],
  ): Promise<void> {
    if (partsSupplies.length === 0) return;

    const reservations = partsSupplies.map((part) =>
      StockReservation.create({
        partSupplyId: part.partSupplyId,
        workOrderId,
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
  ): Promise<void> {
    const workOrderServices = services.map((service) =>
      WorkOrderService.create({
        workOrderId,
        serviceId: service.serviceId,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
      }),
    );

    const workOrderPartSupplies = partsSupplies.map((partSupply) =>
      WorkOrderPartSupply.create({
        workOrderId,
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
}
