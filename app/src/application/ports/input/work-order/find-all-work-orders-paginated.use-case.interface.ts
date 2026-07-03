import { WorkOrder } from '@domain/entities/work-order.entity';
import { FindAllWorkOrdersFilters } from './dto/find-all-work-orders.dto';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';

export interface IFindAllWorkOrdersPaginatedUseCase {
  execute(input: FindAllWorkOrdersFilters): Promise<PaginatedResult<WorkOrder>>;
}
