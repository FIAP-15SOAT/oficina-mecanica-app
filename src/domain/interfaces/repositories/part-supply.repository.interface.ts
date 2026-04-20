import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';

export interface PartSupplyFilters {
  page: number;
  limit: number;
  search?: string;
  category?: PartSupplyCategory;
  isActive?: boolean;
}

export interface IPartSupplyRepository {
  create(partSupply: PartSupply): Promise<PartSupply>;
  findById(id: string): Promise<PartSupply | null>;
  findBySku(sku: string): Promise<PartSupply | null>;
  findAll(filters: PartSupplyFilters): Promise<{ items: PartSupply[]; total: number }>;
  findLowStock(): Promise<PartSupply[]>;
  update(id: string, data: Partial<PartSupply>): Promise<PartSupply>;
  updateStock(
    id: string,
    quantity: number,
    type: StockMovementType,
    reason?: string,
    workOrderId?: string,
  ): Promise<PartSupply>;
  softDelete(id: string): Promise<void>;
}
