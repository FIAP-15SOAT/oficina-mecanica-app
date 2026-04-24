import { Vehicle } from '@domain/entities/vehicle.entity';
import { FindAllVehiclesOutputDto } from '@domain/interfaces/use-cases/vehicle/dto/find-all-vehicles.dto';
import { VehicleDataResponseDto } from './dto/vehicle-response.dto';
import { VehiclePaginatedResponseDto } from './dto/vehicle-paginated-response.dto';

export class VehiclePresenter {
  static toDataResponse(vehicle: Vehicle): VehicleDataResponseDto {
    return { data: vehicle };
  }

  static toPaginatedDataResponse(result: FindAllVehiclesOutputDto): VehiclePaginatedResponseDto {
    return {
      data: result.items,
      pagination: result.pagination,
    };
  }
}
