import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { FindAllVehiclesInputDto } from './dto/find-all-vehicles.dto';

export interface IFindAllVehiclesUseCase {
  execute(input: FindAllVehiclesInputDto): Promise<PaginatedResult<Vehicle>>;
}
