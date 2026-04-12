export class WorkOrderPart {
  id!: string;
  workOrderId!: string;
  partId!: string;
  quantity!: number;
  unitPrice!: number;
  totalPrice!: number;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<WorkOrderPart>) {
    Object.assign(this, partial);
  }
}
