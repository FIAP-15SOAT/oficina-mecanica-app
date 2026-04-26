import { Vehicle } from '@domain/entities/vehicle.entity';
import { FindAllVehiclesOutputDto } from '@domain/interfaces/use-cases/vehicle/dto/find-all-vehicles.dto';
import { CustomerSummaryDto, VehicleDataResponseDto, VehicleResponseDto } from './dto/vehicle-response.dto';
import { VehiclePaginatedResponseDto } from './dto/vehicle-paginated-response.dto';

export class VehiclePresenter {
  static toResponse(vehicle: Vehicle): VehicleResponseDto {
    const customer: CustomerSummaryDto = {
      id: vehicle.customer!.id,
      name: vehicle.customer!.name,
      document: vehicle.customer!.document,
    };
    return {
      id: vehicle.id,
      customerId: vehicle.customerId,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color ?? null,
      mileage: vehicle.mileage ?? null,
      customer,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }

  static toDataResponse(vehicle: Vehicle): VehicleDataResponseDto {
    return { data: VehiclePresenter.toResponse(vehicle) };
  }

  static toPaginatedDataResponse(result: FindAllVehiclesOutputDto): VehiclePaginatedResponseDto {
    return {
      data: result.items.map(VehiclePresenter.toResponse),
      pagination: result.pagination,
    };
  }
}
