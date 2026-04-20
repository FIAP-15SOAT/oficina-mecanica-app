import { StockMovementType } from '../enums/stock-movement-type.enum';

export class StockMovement {
  id!: string;
  partId!: string;
  workOrderId!: string | null;
  type!: StockMovementType;
  quantity!: number;
  reason!: string | null;
  createdAt!: Date;

  constructor(partial: Partial<StockMovement>) {
    Object.assign(this, partial);
  }
}
