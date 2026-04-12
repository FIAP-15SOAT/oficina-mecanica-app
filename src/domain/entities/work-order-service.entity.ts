import { WorkOrderServiceStatus } from '../enums';

export class WorkOrderService {
  id!: string;
  workOrderId!: string;
  serviceId!: string;
  quantity!: number;
  unitPrice!: number;
  totalPrice!: number;
  timeSpentMin!: number | null;
  status!: WorkOrderServiceStatus;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<WorkOrderService>) {
    Object.assign(this, partial);
  }
}
