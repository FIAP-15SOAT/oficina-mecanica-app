import { Vehicle } from '@domain/entities/vehicle.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  CustomerSummaryResponse,
  VehicleDataResponse,
  VehicleListResponse,
  VehiclePaginatedResponse,
  VehicleResponse,
} from './responses/vehicle.response';

export class VehiclePresenter {
  static toResponse(vehicle: Vehicle): VehicleResponse {
    return {
      id: vehicle.id,
      customerId: vehicle.customerId,
      plate: vehicle.plate.value,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color ?? null,
      mileage: vehicle.mileage ?? null,
      customer: VehiclePresenter.toCustomerSummary(vehicle),
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }

  private static toCustomerSummary(vehicle: Vehicle): CustomerSummaryResponse {
    return {
      id: vehicle.customer!.id,
      name: vehicle.customer!.name,
      document: vehicle.customer!.document.value,
    };
  }

  static toDataResponse(vehicle: Vehicle): VehicleDataResponse {
    return { data: VehiclePresenter.toResponse(vehicle) };
  }

  static toPaginatedDataResponse(result: PaginatedResult<Vehicle>): VehiclePaginatedResponse {
    return {
      data: result.items.map((v) => VehiclePresenter.toResponse(v)),
      pagination: result.pagination,
    };
  }

  static toListResponse(vehicles: Vehicle[]): VehicleListResponse {
    return {
      data: vehicles.map((v) => VehiclePresenter.toResponse(v)),
    };
  }
}
