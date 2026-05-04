import { StatusHistory } from '@domain/entities/status-history.entity';
import { IStatusHistoryRepository } from '@domain/interfaces/repositories/status-history.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IFindWorkOrderStatusHistoryUseCase } from '@domain/interfaces/use-cases/reporting/find-work-order-status-history.use-case.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class FindWorkOrderStatusHistoryUseCase implements IFindWorkOrderStatusHistoryUseCase {
  constructor(
    private readonly statusHistoryRepository: IStatusHistoryRepository,
    private readonly workOrderRepository: IWorkOrderRepository,
  ) {}

  async execute(workOrderId: string): Promise<StatusHistory[]> {
    const workOrder = await this.workOrderRepository.findById(workOrderId);

    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de serviço', workOrderId);
    }

    return this.statusHistoryRepository.findByWorkOrderId(workOrderId);
  }
}
