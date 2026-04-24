import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';

export interface FindAllPartsSuppliesInputDto {
  page: number;
  limit: number;
  name?: string;
  sku?: string;
  category?: PartSupplyCategory;
  isActive?: boolean;
  lowStock?: boolean;
}

export interface FindAllPartsSuppliesPaginationDto {
  totalRecords: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface FindAllPartsSuppliesOutputDto {
  items: PartSupply[];
  pagination: FindAllPartsSuppliesPaginationDto;
}
