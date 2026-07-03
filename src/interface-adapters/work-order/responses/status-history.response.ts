import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { WorkOrderAssignedUserResponse } from './work-order.response';

export type StatusHistoryChangedByResponse = WorkOrderAssignedUserResponse;

export interface StatusHistoryResponse {
  id: string;
  changedBy: StatusHistoryChangedByResponse | null;
  previousStatus: WorkOrderStatus | null;
  newStatus: WorkOrderStatus;
  notes: string | null;
  createdAt: Date;
}

export interface StatusHistoryListResponse {
  data: StatusHistoryResponse[];
}
