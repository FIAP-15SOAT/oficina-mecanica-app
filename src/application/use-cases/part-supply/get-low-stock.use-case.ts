import { PartSupply } from '@domain/entities/part-supply.entity';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { IGetLowStockUseCase } from '@domain/interfaces/use-cases/part-supply/get-low-stock.use-case.interface';

export class GetLowStockUseCase implements IGetLowStockUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) {}

  async execute(): Promise<PartSupply[]> {
    return this.partSupplyRepository.findLowStock();
  }
}
