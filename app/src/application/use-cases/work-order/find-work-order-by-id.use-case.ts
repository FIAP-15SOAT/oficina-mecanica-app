import { WorkOrder } from '@domain/entities/work-order.entity';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class FindWorkOrderByIdUseCase {
  constructor(private readonly workOrderRepository: IWorkOrderRepository) {}

  async execute(id: string): Promise<WorkOrder> {
    const workOrder = await this.workOrderRepository.findByIdWithDetails(id);

    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de serviço', id);
    }

    return workOrder;
  }
}
