import { WorkOrderStatus } from '../enums';

export class WorkOrder {
  id!: string;
  number!: string;
  customerId!: string;
  vehicleId!: string;
  assignedUserId!: string | null;
  status!: WorkOrderStatus;
  problemDescription!: string | null;
  internalNotes!: string | null;
  totalAmount!: number;
  approvedAt!: Date | null;
  startedAt!: Date | null;
  finishedAt!: Date | null;
  deliveredAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<WorkOrder>) {
    Object.assign(this, partial);
  }
}
