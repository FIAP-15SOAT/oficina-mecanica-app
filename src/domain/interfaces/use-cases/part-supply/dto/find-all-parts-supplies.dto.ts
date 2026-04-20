import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';

export interface FindAllPartsSuppliesInputDto {
  page: number;
  limit: number;
  search?: string;
  category?: PartSupplyCategory;
  isActive?: boolean;
}

export interface FindAllPartsSuppliesOutputDto {
  items: PartSupply[];
  total: number;
  page: number;
  limit: number;
}
