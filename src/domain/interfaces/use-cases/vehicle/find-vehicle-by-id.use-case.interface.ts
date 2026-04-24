import { Vehicle } from '@domain/entities/vehicle.entity';

export interface IFindVehicleByIdUseCase {
  execute(id: string): Promise<Vehicle>;
}
