import { Vehicle } from '@domain/entities/vehicle.entity';

export interface IFindVehiclesByCustomerIdUseCase {
  execute(customerId: string): Promise<Vehicle[]>;
}
