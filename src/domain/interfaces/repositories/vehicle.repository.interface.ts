import { Vehicle } from '@domain/entities/vehicle.entity';

export interface VehicleFilters {
  page: number;
  limit: number;
  customerId?: string;
  brand?: string;
  plate?: string;
}

export interface IVehicleRepository {
  create(vehicle: Vehicle): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  findByPlate(plate: string): Promise<Vehicle | null>;
  findAll(filters: VehicleFilters): Promise<{ items: Vehicle[]; total: number }>;
  update(id: string, data: Partial<Vehicle>): Promise<Vehicle>;
  delete(id: string): Promise<void>;
  hasWorkOrders(id: string): Promise<boolean>;
}
