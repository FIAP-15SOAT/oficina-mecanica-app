import { WorkOrder } from '@domain/entities/work-order.entity';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';
import { CustomerAccessPolicy } from '@application/policies/customer-access.policy';
import { IFindAllMyWorkOrdersUseCase } from '@application/ports/input/me/find-all-my-work-orders.use-case.interface';

export class FindAllMyWorkOrdersUseCase implements IFindAllMyWorkOrdersUseCase {
  constructor(
    private readonly customerAccessPolicy: CustomerAccessPolicy,
    private readonly workOrderRepository: IWorkOrderRepository,
  ) {}

  async execute(
    userId: string,
    pagination: PaginationInput,
    customerId?: string,
  ): Promise<PaginatedRepositoryResult<WorkOrder>> {
    const authorizedIds = await this.customerAccessPolicy.getAuthorizedCustomerIds(userId);

    const customerIdIn = customerId
      ? authorizedIds.filter((id) => id === customerId)
      : authorizedIds;

    return this.workOrderRepository.findAllPaginated(pagination, { customerIdIn });
  }
}
