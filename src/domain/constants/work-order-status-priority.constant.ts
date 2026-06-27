import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export const WORK_ORDER_STATUS_PRIORITY: Record<WorkOrderStatus, number> = {
  [WorkOrderStatus.RECEIVED]:          1,
  [WorkOrderStatus.IN_DIAGNOSIS]:      2,
  [WorkOrderStatus.AWAITING_APPROVAL]: 3,
  [WorkOrderStatus.REJECTED]:          4,
  [WorkOrderStatus.APPROVED]:          5,
  [WorkOrderStatus.IN_PROGRESS]:       6,
  [WorkOrderStatus.COMPLETED]:         7,
  [WorkOrderStatus.DELIVERED]:         8,
  [WorkOrderStatus.CANCELLED]:         9,
};
