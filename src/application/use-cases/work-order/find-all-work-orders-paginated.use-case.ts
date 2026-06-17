import { WorkOrder } from '@domain/entities/work-order.entity';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IFindAllWorkOrdersPaginatedUseCase } from '@domain/interfaces/use-cases/work-order/find-all-work-orders-paginated.use-case.interface';
import { FindAllWorkOrdersFilters } from '@domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';
import { parseSort } from '@application/utils/parse-sort.util';
import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';

const DEFAULT_SORT: SortCriterion[] = [
  new SortCriterion('status', SortDirection.DESC),
  new SortCriterion('createdAt', SortDirection.ASC),
];

export class FindAllWorkOrdersPaginatedUseCase implements IFindAllWorkOrdersPaginatedUseCase {
  constructor(private readonly workOrderRepository: IWorkOrderRepository) {}

  async execute(input: FindAllWorkOrdersFilters): Promise<PaginatedResult<WorkOrder>> {
    const { page, limit, sort: rawSort, ...filters } = input;
    const pagination: PaginationInput = { page, limit };

    const criteria = parseSort(rawSort);
    const sort = criteria.length > 0 ? criteria : DEFAULT_SORT;

    WorkOrder.validateAllowedSortFields(sort.map((c) => c.field));

    const result = await this.workOrderRepository.findAllPaginated(pagination, filters, sort);

    return buildPaginatedResult(result, pagination);
  }
}
