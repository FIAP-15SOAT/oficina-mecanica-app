import { WorkOrder } from '@domain/entities/work-order.entity';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IFindAllWorkOrdersPaginatedUseCase } from '@domain/interfaces/use-cases/work-order/find-all-work-orders-paginated.use-case.interface';
import { FindAllWorkOrdersFilters } from '@domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';
import { WorkOrderSortBy } from '@domain/enums/work-order-sort-by.enum';

export class FindAllWorkOrdersPaginatedUseCase implements IFindAllWorkOrdersPaginatedUseCase {
  constructor(private readonly workOrderRepository: IWorkOrderRepository) {}

  async execute(input: FindAllWorkOrdersFilters): Promise<PaginatedResult<WorkOrder>> {
    const { page, limit, sortBy: sortByInput, ...filters } = input;
    const pagination: PaginationInput = { page, limit };
    const sortBy = sortByInput ?? WorkOrderSortBy.STATUS_PRIORITY;

    const result = await this.workOrderRepository.findAllPaginated(pagination, {
      ...filters,
      sortBy,
    });

    return buildPaginatedResult(result, pagination);
  }
}
