import { WorkOrder } from '@domain/entities/work-order.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { UpdateWorkOrderStatusDto } from '@domain/interfaces/use-cases/work-order/dto/update-work-order-status.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateWorkOrderStatusUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(id: string, dto: UpdateWorkOrderStatusDto): Promise<WorkOrder> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const workOrder = await repos.workOrder.findById(id);

      if (!workOrder) {
        throw new ResourceNotFoundException('Ordem de serviço não encontrada');
      }

      WorkOrder.assertAllowedPatchStatus(dto.status);

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
