import { StockMovement } from '../../entities/stock-movement.entity';

export interface IStockMovementRepository {
  create(movement: StockMovement): Promise<StockMovement>;
  findByPartId(partId: string): Promise<StockMovement[]>;
  findByWorkOrderId(workOrderId: string): Promise<StockMovement[]>;
}
