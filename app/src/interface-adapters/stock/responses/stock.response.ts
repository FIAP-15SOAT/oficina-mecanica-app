import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PersonType } from '@domain/enums/person-type.enum';
import { UserRole } from '@domain/enums/user-role.enum';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { PaginationMeta } from '@domain/interfaces/common/pagination.interface';

export interface StockPartSupplyResponse {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  partNumber: string | null;
  category: PartSupplyCategory;
  unit: Unit;
}

export interface StockWorkOrderCustomerResponse {
  id: string;
  name: string;
  type: PersonType;
  document: string;
  phone: string;
  email: string;
}

export interface StockWorkOrderVehicleResponse {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
}

export interface StockWorkOrderAssignedUserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface StockWorkOrderResponse {
  id: string;
  number: string;
  customer: StockWorkOrderCustomerResponse;
  vehicle: StockWorkOrderVehicleResponse;
  assignedUser: StockWorkOrderAssignedUserResponse | null;
}

export interface StockMovementResponse {
  id: string;
  partSupply: StockPartSupplyResponse;
  workOrder: StockWorkOrderResponse | null;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  createdAt: Date;
}

export interface StockReservationResponse {
  id: string;
  partSupply: StockPartSupplyResponse;
  workOrder: StockWorkOrderResponse;
  quantity: number;
  createdAt: Date;
}

export interface StockMovementPaginatedResponse {
  data: StockMovementResponse[];
  pagination: PaginationMeta;
}

export interface StockReservationPaginatedResponse {
  data: StockReservationResponse[];
  pagination: PaginationMeta;
}
