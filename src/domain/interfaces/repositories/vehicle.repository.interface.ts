import { Vehicle } from '../../entities/vehicle.entity';

export interface IVehicleRepository {
  create(vehicle: Vehicle): Promise<Vehicle>;
  findById(id: string): Promise<Vehicle | null>;
  findByPlate(plate: string): Promise<Vehicle | null>;
  findByCustomerId(customerId: string): Promise<Vehicle[]>;
  findAll(): Promise<Vehicle[]>;
  update(id: string, data: Partial<Vehicle>): Promise<Vehicle>;
  delete(id: string): Promise<void>;
}
