import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export const WORK_ORDER_STATUS_PRIORITY: Record<WorkOrderStatus, number> = {
  [WorkOrderStatus.IN_PROGRESS]:       1,
  [WorkOrderStatus.AWAITING_APPROVAL]: 2,
  [WorkOrderStatus.APPROVED]:          3,
  [WorkOrderStatus.IN_DIAGNOSIS]:      4,
  [WorkOrderStatus.RECEIVED]:          5,
  [WorkOrderStatus.REJECTED]:          6,
  [WorkOrderStatus.CANCELLED]:         7,
  [WorkOrderStatus.COMPLETED]:         8,
  [WorkOrderStatus.DELIVERED]:         9,
};
