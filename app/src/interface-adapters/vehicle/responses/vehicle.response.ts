import { PaginationMeta } from '@domain/interfaces/common/pagination.interface';

export interface CustomerSummaryResponse {
  id: string;
  name: string;
  document: string;
}

export interface VehicleResponse {
  id: string;
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  mileage: number | null;
  customer: CustomerSummaryResponse;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleDataResponse {
  data: VehicleResponse;
}

export interface VehiclePaginatedResponse {
  data: VehicleResponse[];
  pagination: PaginationMeta;
}

export interface VehicleListResponse {
  data: VehicleResponse[];
}
