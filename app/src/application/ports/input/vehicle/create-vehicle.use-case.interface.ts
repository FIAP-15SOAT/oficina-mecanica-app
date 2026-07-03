import { Vehicle } from '@domain/entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

export interface ICreateVehicleUseCase {
  execute(input: CreateVehicleDto): Promise<Vehicle>;
}
