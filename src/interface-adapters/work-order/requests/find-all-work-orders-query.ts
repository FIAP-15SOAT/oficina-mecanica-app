import { PaginationQuery } from '@domain/interfaces/common/pagination.interface';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export interface FindAllWorkOrdersQuery extends PaginationQuery {
  number?: string;
  customerId?: string;
  vehicleId?: string;
  assignedUserId?: string;
  status?: WorkOrderStatus;
  sort?: string;
}
