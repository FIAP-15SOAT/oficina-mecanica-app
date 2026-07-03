import { Vehicle } from '@domain/entities/vehicle.entity';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

export interface IUpdateVehicleUseCase {
  execute(id: string, input: UpdateVehicleDto): Promise<Vehicle>;
}
