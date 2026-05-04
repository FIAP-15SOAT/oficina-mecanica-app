import { Vehicle } from '@domain/entities/vehicle.entity';
import { PaginatedRepositoryResult, PaginationInput } from '../common/pagination.interface';

export interface VehicleFilters {
  customerId?: string;
  brand?: string;
  plate?: string;
}

export interface IVehicleRepository {
  create(vehicle: Vehicle): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  findByPlate(plate: string): Promise<Vehicle | null>;
  findAllByCustomerId(customerId: string): Promise<Vehicle[]>;
  findAllPaginated(
    pagination: PaginationInput,
    filters: VehicleFilters,
  ): Promise<PaginatedRepositoryResult<Vehicle>>;
  update(id: string, data: Partial<Vehicle>): Promise<Vehicle>;
  delete(id: string): Promise<void>;
  hasWorkOrders(id: string): Promise<boolean>;
}
