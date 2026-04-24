import { Vehicle } from '@domain/entities/vehicle.entity';

export interface FindAllVehiclesInputDto {
  page: number;
  limit: number;
  customerId?: string;
  brand?: string;
  plate?: string;
}

export interface FindAllVehiclesOutputDto {
  items: Vehicle[];
  totalRecords: number;
  totalPages: number;
  page: number;
  limit: number;
}
