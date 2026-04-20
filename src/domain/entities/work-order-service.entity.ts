import { WorkOrderServiceStatus } from '../enums/work-order-service-status.enum';

export class WorkOrderService {
  id!: string;
  workOrderId!: string;
  serviceId!: string;
  quantity!: number;
  unitPrice!: number;
  totalPrice!: number;
  status!: WorkOrderServiceStatus;
  startedAt!: Date | null;
  finishedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<WorkOrderService>) {
    Object.assign(this, partial);
  }
}
