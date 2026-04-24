import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { UpdateStockDto } from '@domain/interfaces/use-cases/part-supply/dto/update-stock.dto';

export interface PartSupplyFilters {
  page: number;
  limit: number;
  name?: string;
  sku?: string;
  category?: PartSupplyCategory;
  isActive?: boolean;
  lowStock?: boolean;
}

export interface PaginatedPartSuppliesDto {
  items: PartSupply[];
  total: number;
}

export interface IPartSupplyRepository {
  create(partSupply: PartSupply): Promise<PartSupply>;
  findById(id: string): Promise<PartSupply | null>;
  findBySku(sku: string): Promise<PartSupply | null>;
  findAllPaginated(filters: PartSupplyFilters): Promise<PaginatedPartSuppliesDto>;
  update(id: string, data: Partial<PartSupply>): Promise<PartSupply>;
  updateStock(id: string, data: UpdateStockDto): Promise<PartSupply>;
  softDelete(id: string): Promise<void>;
}
