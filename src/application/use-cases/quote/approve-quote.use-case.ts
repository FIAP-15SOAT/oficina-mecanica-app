import { Quote } from '@domain/entities/quote.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { IRepositories, IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class ApproveQuoteUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(quoteId: string, userId?: string | null): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findByIdWithDetails(quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', quoteId);
      }

      quote.approve();

      const workOrder = (await repos.workOrder.findById(quote.workOrderId))!;

      const partsSupplies = quote.partsSupplies ?? [];

      await this.reserveStock(repos, workOrder.id, partsSupplies);

      const previousStatus = workOrder.status;

      workOrder.changeStatus(WorkOrderStatus.APPROVED);

      const { services: woServices, partSupplies: woPartSupplies } =
        workOrder.applyQuoteItems(quote);

      await Promise.all([
        repos.workOrder.addServiceItems(workOrder, woServices),
        repos.workOrder.addPartSupplyItems(workOrder, woPartSupplies),
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

  private async reserveStock(
    repos: IRepositories,
    workOrderId: string,
    partsSupplies: QuotePartSupply[],
  ): Promise<void> {
    if (partsSupplies.length === 0) return;

    const partSupplyIds = partsSupplies.map((p) => p.partSupplyId);

    const partSupplies = await repos.partSupply.findByIds(partSupplyIds);

    const reservations: StockReservation[] = [];

    for (const partSupply of partsSupplies) {
      const entity = partSupplies.find((p) => p.id === partSupply.partSupplyId)!;

      entity.reserve(partSupply.quantity);

      await repos.partSupply.update(entity.id, entity);

      reservations.push(
        StockReservation.create({
          partSupplyId: partSupply.partSupplyId,
          workOrderId,
          quantity: partSupply.quantity,
        }),
      );
    }

    await repos.stockReservation.createMany(reservations);
  }
}
