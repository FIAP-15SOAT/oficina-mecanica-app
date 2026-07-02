import type { WorkOrderResponseDto } from '@presentation/work-order/dto/work-order-response.dto';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { PaginationMeta } from '@domain/interfaces/common/pagination.interface';

export interface QuoteServiceItemResponse {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotePartSupplyItemResponse {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  partNumber: string | null;
  category: PartSupplyCategory;
  unit: Unit;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuoteResponse {
  id: string;
  workOrder: WorkOrderResponseDto;
  status: QuoteStatus;
  notes: string | null;
  sentAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  servicesAmount: number;
  partsAmount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuoteWithItemsResponse extends QuoteResponse {
  services: QuoteServiceItemResponse[];
  partsSupplies: QuotePartSupplyItemResponse[];
}

export interface QuoteDataResponse {
  data: QuoteResponse;
}

export interface QuoteWithItemsDataResponse {
  data: QuoteWithItemsResponse;
}

export interface QuoteListResponse {
  data: QuoteResponse[];
}

export interface QuotePaginatedResponse {
  data: QuoteResponse[];
  pagination: PaginationMeta;
}
