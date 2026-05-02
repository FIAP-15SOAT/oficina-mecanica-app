import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';

export interface UpdateWorkOrderServiceStatusDto {
  workOrderId: string;
  serviceId: string;
  status: WorkOrderServiceStatus.IN_PROGRESS | WorkOrderServiceStatus.COMPLETED;
  userId?: string | null;
}
