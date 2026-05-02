import { StockReservation } from '../../entities/stock-reservation.entity';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '../common/pagination.interface';

export interface StockReservationFilters {
  partSupplyId?: string;
  workOrderId?: string;
}

export interface IStockReservationRepository {
  create(reservation: StockReservation): Promise<StockReservation>;
  createMany(reservations: StockReservation[]): Promise<void>;
  findById(id: string): Promise<StockReservation | null>;
  findByWorkOrderId(workOrderId: string): Promise<StockReservation[]>;
  findByPartSupplyId(partSupplyId: string): Promise<StockReservation[]>;
  findAllPaginated(
    pagination: PaginationInput,
    filters: StockReservationFilters,
  ): Promise<PaginatedRepositoryResult<StockReservation>>;
  deleteById(id: string): Promise<void>;
  deleteByWorkOrderId(workOrderId: string): Promise<void>;
}
