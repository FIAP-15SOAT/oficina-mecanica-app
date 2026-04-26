import { Vehicle } from '@domain/entities/vehicle.entity';

export interface FindAllVehiclesInputDto {
  page: number;
  limit: number;
  customerId?: string;
  brand?: string;
  plate?: string;
}

export interface FindAllVehiclesPaginationDto {
  totalRecords: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface FindAllVehiclesOutputDto {
  items: Vehicle[];
  pagination: FindAllVehiclesPaginationDto;
}
