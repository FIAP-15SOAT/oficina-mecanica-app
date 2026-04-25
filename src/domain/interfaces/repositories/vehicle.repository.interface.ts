import { Vehicle } from '@domain/entities/vehicle.entity';

export interface VehicleFilters {
  page: number;
  limit: number;
  customerId?: string;
  brand?: string;
  plate?: string;
}

export interface PaginatedVehiclesDto {
  items: Vehicle[];
  total: number;
}

export interface IVehicleRepository {
  create(vehicle: Vehicle): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  findByPlate(plate: string): Promise<Vehicle | null>;
  findAllPaginated(filters: VehicleFilters): Promise<PaginatedVehiclesDto>;
  update(id: string, data: Partial<Vehicle>): Promise<Vehicle>;
  delete(id: string): Promise<void>;
  hasWorkOrders(id: string): Promise<boolean>;
}
