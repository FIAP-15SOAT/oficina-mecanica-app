import { WorkOrder } from '@domain/entities/work-order.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { UpdateWorkOrderStatusDto } from '@application/ports/input/work-order/dto/update-work-order-status.dto';

import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

export class UpdateWorkOrderStatusUseCase {
  private static readonly PATCH_STATUS_ALLOWED = new Set<WorkOrderStatus>([
    WorkOrderStatus.IN_DIAGNOSIS,
    WorkOrderStatus.CANCELLED,
    WorkOrderStatus.DELIVERED,
  ]);

  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(id: string, dto: UpdateWorkOrderStatusDto): Promise<WorkOrder> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const workOrder = await repos.workOrder.findById(id);

      if (!workOrder) {
        throw new ResourceNotFoundException('Ordem de serviço não encontrada');
      }

      if (!UpdateWorkOrderStatusUseCase.PATCH_STATUS_ALLOWED.has(dto.status)) {
        throw new BusinessRuleViolationException(
          `O status "${dto.status}" não é permitido nesta operação.`,
        );
      }

      const previousStatus = workOrder.status;
      workOrder.changeStatus(dto.status, dto.notes);

      const saved = await repos.workOrder.update(workOrder);

      await repos.statusHistory.create(
        StatusHistory.create({
          workOrderId: saved.id,
          changedById: dto.userId,
          previousStatus,
          newStatus: dto.status,
          notes: dto.notes,
        }),
      );

      return saved;
    });
  }
}
