import { WorkOrderStatus } from '../enums/work-order-status.enum';

export class StatusHistory {
  id!: string;
  workOrderId!: string;
  changedById!: string | null;
  previousStatus!: WorkOrderStatus | null;
  newStatus!: WorkOrderStatus;
  notes!: string | null;
  createdAt!: Date;

  constructor(partial: Partial<StatusHistory>) {
    Object.assign(this, partial);
  }
}
