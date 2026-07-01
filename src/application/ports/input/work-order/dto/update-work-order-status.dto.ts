import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export interface UpdateWorkOrderStatusDto {
  status: WorkOrderStatus;
  notes?: string | null;
  userId: string;
}
