import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { UpdateStockDto } from '@domain/interfaces/use-cases/part-supply/dto/update-stock.dto';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '../common/pagination.interface';

export interface PartSupplyFilters {
  name?: string;
  sku?: string;
  category?: PartSupplyCategory;
  isActive?: boolean;
  lowStock?: boolean;
}

export interface IPartSupplyRepository {
  create(partSupply: PartSupply): Promise<PartSupply>;
  findById(id: string): Promise<PartSupply | null>;
  findBySku(sku: string): Promise<PartSupply | null>;
  findAllPaginated(
    pagination: PaginationInput,
    filters: PartSupplyFilters,
  ): Promise<PaginatedRepositoryResult<PartSupply>>;
  update(id: string, data: Partial<PartSupply>): Promise<PartSupply>;
  updateStock(id: string, data: UpdateStockDto): Promise<PartSupply>;
  incrementReservedStock(id: string, amount: number): Promise<void>;
  decrementReservedStock(id: string, amount: number): Promise<void>;
  incrementStock(id: string, amount: number): Promise<void>;
  decrementStock(id: string, amount: number): Promise<void>;
  hasQuotePartSupplies(id: string): Promise<boolean>;
  hasWorkOrderPartSupplies(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}
