import { WorkOrder, PATCH_STATUS_ALLOWED } from '@domain/entities/work-order.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { UpdateWorkOrderStatusDto } from '@domain/interfaces/use-cases/work-order/dto/update-work-order-status.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

export class UpdateWorkOrderStatusUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) { }

  async execute(id: string, dto: UpdateWorkOrderStatusDto): Promise<WorkOrder> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const workOrder = await repos.workOrder.findById(id);

      if (!workOrder) {
        throw new ResourceNotFoundException('Ordem de serviço não encontrada');
      }

      if (!PATCH_STATUS_ALLOWED.includes(dto.status)) {
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
          changedById: dto.userId ?? null,
          previousStatus,
          newStatus: dto.status,
          notes: dto.notes,
        }),
      );

      return saved;
    });
  }
}
