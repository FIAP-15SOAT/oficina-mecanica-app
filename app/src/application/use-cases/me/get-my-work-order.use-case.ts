import { WorkOrder } from '@domain/entities/work-order.entity';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { CustomerAccessPolicy } from '@application/policies/customer-access.policy';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class GetMyWorkOrderUseCase {
  constructor(
    private readonly workOrderRepository: IWorkOrderRepository,
    private readonly customerAccessPolicy: CustomerAccessPolicy,
  ) {}

  async execute(userId: string, workOrderId: string): Promise<WorkOrder> {
    const workOrder = await this.workOrderRepository.findByIdWithDetails(workOrderId);

    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de Serviço', workOrderId);
    }

    await this.customerAccessPolicy.assertCustomerAuthorized(userId, workOrder.customerId);

    return workOrder;
  }
}
