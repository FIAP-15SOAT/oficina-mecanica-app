import { Vehicle } from '@domain/entities/vehicle.entity';
import { FindAllVehiclesOutputDto } from '@domain/interfaces/use-cases/vehicle/dto/find-all-vehicles.dto';
import { VehicleDataResponseDto } from './dto/vehicle-response.dto';
import { VehiclePaginatedResponseDto } from './dto/vehicle-paginated-response.dto';

export class VehiclePresenter {
  static toResponse(vehicle: Vehicle): VehicleDataResponseDto {
    return { data: vehicle };
  }

  static toPaginatedResponse(result: FindAllVehiclesOutputDto): VehiclePaginatedResponseDto {
    return {
      data: result.items,
      totalRecords: result.totalRecords,
      totalPages: result.totalPages,
      page: result.page,
      limit: result.limit,
    };
  }
}
