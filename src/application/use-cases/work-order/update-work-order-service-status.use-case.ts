import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
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
      const { workOrder, workOrderService } = await this.validateAndGetWorkOrderAndService(
        repos,
        dto,
      );

      if (dto.status === WorkOrderServiceStatus.IN_PROGRESS) {
        await this.processInProgressStatus(repos, workOrder, workOrderService, dto.userId);
      } else {
        await this.processCompletedStatus(repos, workOrder, workOrderService, dto.userId);
      }

      return workOrderService;
    });
  }

  private async validateAndGetWorkOrderAndService(
    repos: IRepositories,
    dto: UpdateWorkOrderServiceStatusDto,
  ) {
    const workOrder = await repos.workOrder.findById(dto.workOrderId);
    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de Serviço', dto.workOrderId);
    }

    const workOrderService = await repos.workOrderService.findByWorkOrderAndService(
      dto.workOrderId,
      dto.serviceId,
    );
    if (!workOrderService) {
      throw new ResourceNotFoundException('Serviço da Ordem de Serviço', `${dto.workOrderId}`);
    }

    return { workOrder, workOrderService };
  }

  private async processInProgressStatus(
    repos: IRepositories,
    workOrder: WorkOrder,
    workOrderService: WorkOrderService,
    userId?: string | null,
  ) {
    workOrderService.startService();

    if (workOrder.status !== WorkOrderStatus.IN_PROGRESS) {
      const previousWoStatus = workOrder.status;

      await this.updateStockFromReservations(repos, workOrder);
      await this.updateWorkOrderStatus(repos, workOrder, WorkOrderStatus.IN_PROGRESS);
      await this.createStatusHistory(
        repos,
        workOrder.id,
        userId,
        previousWoStatus,
        WorkOrderStatus.IN_PROGRESS,
      );
    }

    await repos.workOrderService.update(workOrderService);
  }

  private async processCompletedStatus(
    repos: IRepositories,
    workOrder: WorkOrder,
    workOrderService: WorkOrderService,
    userId?: string | null,
  ) {
    workOrderService.completeService();
    await repos.workOrderService.update(workOrderService);

    const isAllCompleted = await repos.workOrderService.isAllCompletedByWorkOrderId(workOrder.id);
    if (isAllCompleted) {
      const previousStatus = workOrder.status;
      await this.updateWorkOrderStatus(repos, workOrder, WorkOrderStatus.COMPLETED);
      await this.createStatusHistory(
        repos,
        workOrder.id,
        userId,
        previousStatus,
        WorkOrderStatus.COMPLETED,
      );
    }
  }

  private async updateStockFromReservations(repos: IRepositories, workOrder: WorkOrder) {
    const reservations = await repos.stockReservation.findByWorkOrderId(workOrder.id);

    for (const reservation of reservations) {
      const movement = StockMovement.create({
        partSupplyId: reservation.partSupplyId,
        workOrderId: workOrder.id,
        quantity: reservation.quantity,
        type: StockMovementType.EXIT,
        reason: `Saída por Ordem de Serviço ${workOrder.number}`,
      });

      await repos.stockMovement.create(movement);
      await repos.partSupply.decrementStock(reservation.partSupplyId, reservation.quantity);
      await repos.partSupply.decrementReservedStock(reservation.partSupplyId, reservation.quantity);
    }

    await repos.stockReservation.deleteByWorkOrderId(workOrder.id);
  }

  private async updateWorkOrderStatus(
    repos: IRepositories,
    workOrder: WorkOrder,
    status: WorkOrderStatus,
  ) {
    workOrder.changeStatus(status);
    await repos.workOrder.update(workOrder);
  }

  private async createStatusHistory(
    repos: IRepositories,
    workOrderId: string,
    userId: string | null | undefined,
    previousStatus: WorkOrderStatus,
    newStatus: WorkOrderStatus,
  ) {
    const history = StatusHistory.create({
      workOrderId: workOrderId,
      changedById: userId ?? null,
      previousStatus: previousStatus,
      newStatus: newStatus,
      notes: null,
    });

    await repos.statusHistory.create(history);
  }
}
