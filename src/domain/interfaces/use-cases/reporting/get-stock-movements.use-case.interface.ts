import { StockMovementFilters } from '@domain/interfaces/repositories/stock-movement.repository.interface';
import { StockMovement } from '@domain/entities/stock-movement.entity';

export interface PaginatedStockMovementsResult {
  items: StockMovement[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

export interface IGetStockMovementsUseCase {
  execute(filters: StockMovementFilters): Promise<PaginatedStockMovementsResult>;
}
