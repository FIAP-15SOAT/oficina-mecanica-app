import { WorkOrder } from '@domain/entities/work-order.entity';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';

export interface IFindAllMyWorkOrdersUseCase {
  execute(
    userId: string,
    pagination: PaginationInput,
    customerId?: string,
  ): Promise<PaginatedRepositoryResult<WorkOrder>>;
}
