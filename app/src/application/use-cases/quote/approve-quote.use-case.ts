import { Quote } from '@domain/entities/quote.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

import { IRepositories, IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';
import { IApproveQuoteUseCase } from '@application/ports/input/quote/approve-quote.use-case.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

interface StockReservationSummary {
  reservedItemCount: number;
  reservedQuantity: number;
}

export class ApproveQuoteUseCase implements IApproveQuoteUseCase {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly logger: ILogger,
  ) {}

  async execute(quoteId: string, userId?: string | null): Promise<Quote> {
    const {
      quote,
      workOrderId,
      workOrderNumber,
      previousQuoteStatus,
      previousStatus,
      reservation,
    } = await this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findByIdWithDetails(quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', quoteId);
      }

      const previousQuoteStatus = quote.status;

      quote.approve();

      const workOrder = (await repos.workOrder.findByIdWithDetails(quote.workOrderId))!;

      const partsSupplies = quote.partsSupplies;

      const reservation = await this.reserveStock(repos, workOrder.id, partsSupplies);

      const previousStatus = workOrder.status;

      workOrder.changeStatus(WorkOrderStatus.APPROVED);

      const { services: woServices, partSupplies: woPartSupplies } =
        workOrder.applyQuoteItems(quote);

      await Promise.all([
        repos.workOrder.addServiceItems(woServices),
        repos.workOrder.addPartSupplyItems(woPartSupplies),
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

      return {
        quote,
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.number.toString(),
        previousQuoteStatus,
        previousStatus,
        reservation,
      };
    });

    if (reservation.reservedItemCount > 0) {
      this.logger.event(BUSINESS_EVENTS.STOCK_RESERVED, {
        quoteId: quote.id,
        workOrderId,
        workOrderNumber,
        ...reservation,
      });
    }

    this.logger.event(BUSINESS_EVENTS.QUOTE_APPROVED, {
      quoteId: quote.id,
      previousQuoteStatus,
      workOrderId,
      workOrderNumber,
      previousWorkOrderStatus: previousStatus,
    });

    return quote;
  }

  private async reserveStock(
    repos: IRepositories,
    workOrderId: string,
    partsSupplies: QuotePartSupply[],
  ): Promise<StockReservationSummary> {
    if (partsSupplies.length === 0) {
      return { reservedItemCount: 0, reservedQuantity: 0 };
    }

    const partSupplyIds = partsSupplies.map((p) => p.partSupplyId);

    const partSupplies = await repos.partSupply.findByIds(partSupplyIds);

    const reservations: StockReservation[] = [];

    for (const partSupply of partsSupplies) {
      const entity = partSupplies.find((p) => p.id === partSupply.partSupplyId)!;

      entity.reserve(partSupply.quantity);

      await repos.partSupply.update(entity);

      reservations.push(
        StockReservation.create({
          partSupplyId: partSupply.partSupplyId,
          workOrderId,
          quantity: partSupply.quantity,
        }),
      );
    }

    await repos.stockReservation.createMany(reservations);

    return {
      reservedItemCount: reservations.length,
      reservedQuantity: reservations.reduce((total, item) => total + item.quantity, 0),
    };
  }
}
