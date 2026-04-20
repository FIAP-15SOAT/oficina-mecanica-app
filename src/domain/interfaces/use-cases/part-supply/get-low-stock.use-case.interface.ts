import { PartSupply } from '@domain/entities/part-supply.entity';

export interface IGetLowStockUseCase {
  execute(): Promise<PartSupply[]>;
}
