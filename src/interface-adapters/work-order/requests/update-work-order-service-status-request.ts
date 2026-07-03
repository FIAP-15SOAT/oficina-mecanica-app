import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';

export interface UpdateWorkOrderServiceStatusRequest {
  status: WorkOrderServiceStatus.IN_PROGRESS | WorkOrderServiceStatus.COMPLETED;
}
