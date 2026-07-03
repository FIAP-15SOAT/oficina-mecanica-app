import { WorkOrder } from '@domain/entities/work-order.entity';
import {
  IWorkOrderRepository,
  WorkOrderFilters,
} from '@domain/interfaces/repositories/work-order.repository.interface';
import { IFindAllWorkOrdersPaginatedUseCase } from '@application/ports/input/work-order/find-all-work-orders-paginated.use-case.interface';
import { FindAllWorkOrdersFilters } from '@application/ports/input/work-order/dto/find-all-work-orders.dto';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';
import { parseSort } from '@application/utils/parse-sort.util';
import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export class FindAllWorkOrdersPaginatedUseCase implements IFindAllWorkOrdersPaginatedUseCase {
  private static readonly ALLOWED_SORT_FIELDS = new Set(['status', 'createdAt']);

  private static readonly DEFAULT_HIDDEN_STATUSES: WorkOrderStatus[] = [
    WorkOrderStatus.COMPLETED,
    WorkOrderStatus.DELIVERED,
    WorkOrderStatus.CANCELLED,
  ];

  private static readonly DEFAULT_SORT: SortCriterion[] = [
    { field: 'status', direction: SortDirection.DESC },
    { field: 'createdAt', direction: SortDirection.ASC },
  ];

  constructor(private readonly workOrderRepository: IWorkOrderRepository) {}

  async execute(input: FindAllWorkOrdersFilters): Promise<PaginatedResult<WorkOrder>> {
    const { page, limit, sort: rawSort, ...inputFilters } = input;
    const pagination: PaginationInput = { page, limit };

    const criteria = parseSort(rawSort, FindAllWorkOrdersPaginatedUseCase.ALLOWED_SORT_FIELDS);
    const sort = criteria.length > 0 ? criteria : FindAllWorkOrdersPaginatedUseCase.DEFAULT_SORT;

    const filters: WorkOrderFilters = { ...inputFilters };

    if (!inputFilters.status) {
      filters.statusNotIn = FindAllWorkOrdersPaginatedUseCase.DEFAULT_HIDDEN_STATUSES;
    }

    const result = await this.workOrderRepository.findAllPaginated(pagination, filters, sort);

    return buildPaginatedResult(result, pagination);
  }
}
