import { PaginationInput } from '@domain/interfaces/common/pagination.interface';

export interface FindAllVehiclesInputDto extends PaginationInput {
  customerId?: string;
  brand?: string;
  plate?: string;
}