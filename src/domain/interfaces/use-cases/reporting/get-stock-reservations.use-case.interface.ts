import { StockReservationFilters } from '@domain/interfaces/repositories/stock-reservation.repository.interface';
import { StockReservation } from '@domain/entities/stock-reservation.entity';

export interface PaginatedStockReservationsResult {
  items: StockReservation[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

export interface IGetStockReservationsUseCase {
  execute(filters: StockReservationFilters): Promise<PaginatedStockReservationsResult>;
}
