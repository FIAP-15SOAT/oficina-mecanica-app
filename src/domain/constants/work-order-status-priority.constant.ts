import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export const WORK_ORDER_STATUS_PRIORITY: Record<WorkOrderStatus, number> = {
  [WorkOrderStatus.IN_PROGRESS]:       1,
  [WorkOrderStatus.APPROVED]:          2,
  [WorkOrderStatus.REJECTED]:          3,
  [WorkOrderStatus.AWAITING_APPROVAL]: 4,
  [WorkOrderStatus.IN_DIAGNOSIS]:      5,
  [WorkOrderStatus.RECEIVED]:          6,
  [WorkOrderStatus.CANCELLED]:         7,
  [WorkOrderStatus.COMPLETED]:         8,
  [WorkOrderStatus.DELIVERED]:         9,
};
