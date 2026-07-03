import { PaginationQuery } from '@domain/interfaces/common/pagination.interface';

export interface FindAllVehiclesQuery extends PaginationQuery {
  customerId?: string;
  brand?: string;
  plate?: string;
}
