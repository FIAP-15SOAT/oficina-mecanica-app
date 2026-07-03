import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export interface UpdateWorkOrderStatusRequest {
  status: WorkOrderStatus;
  notes?: string | null;
}
