import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { IRepositories, IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { UpdateWorkOrderServiceStatusDto } from '@domain/interfaces/use-cases/work-order/dto/update-work-order-service-status.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateWorkOrderServiceStatusUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(dto: UpdateWorkOrderServiceStatusDto): Promise<WorkOrderService> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const workOrder = await repos.workOrder.findById(dto.workOrderId);

      if (!workOrder) {
        throw new ResourceNotFoundException('Ordem de Serviço', dto.workOrderId);
      }

      const previousStatus = workOrder.status;

      if (dto.status === WorkOrderServiceStatus.IN_PROGRESS) {
        workOrder.startServiceItem(dto.serviceId);
      } else {
        workOrder.completeServiceItem(dto.serviceId);
      }

      const statusChanged = workOrder.status !== previousStatus;

      if (dto.status === WorkOrderServiceStatus.IN_PROGRESS && statusChanged) {
        await this.updateStockFromReservations(repos, workOrder);
      }

      await repos.workOrder.updateServiceItemStatus(
        workOrder.services!.find((s) => s.serviceId === dto.serviceId)!,
      );

      if (statusChanged) {
        await Promise.all([
          repos.workOrder.update(workOrder),
          repos.statusHistory.create(
            StatusHistory.create({
              workOrderId: workOrder.id,
              changedById: dto.userId,
              previousStatus,
              newStatus: workOrder.status,
              notes: null,
            }),
          ),
        ]);
      }

      return workOrder.services!.find((s) => s.serviceId === dto.serviceId)!;
    });
  }

  private async updateStockFromReservations(repos: IRepositories, workOrder: WorkOrder) {
    const reservations = await repos.stockReservation.findByWorkOrderId(workOrder.id);

    if (reservations.length === 0) return;

    const partSupplyIds = reservations.map((r) => r.partSupplyId);
    const partSupplies = await repos.partSupply.findByIds(partSupplyIds);

    for (const reservation of reservations) {
      const partSupply = partSupplies.find((ps) => ps.id === reservation.partSupplyId)!;

      const movement = StockMovement.create({
        partSupplyId: reservation.partSupplyId,
        workOrderId: workOrder.id,
        quantity: reservation.quantity,
        type: StockMovementType.EXIT,
        reason: `Saída por Ordem de Serviço ${workOrder.number}`,
      });

      partSupply.consumeReserved(reservation.quantity);

      await Promise.all([
        repos.stockMovement.create(movement),
        repos.partSupply.update(reservation.partSupplyId, {
          stock: partSupply.stock,
          reservedStock: partSupply.reservedStock,
          version: partSupply.version,
          updatedAt: partSupply.updatedAt,
        }),
      ]);
    }

    await repos.stockReservation.deleteByWorkOrderId(workOrder.id);
  }
}
