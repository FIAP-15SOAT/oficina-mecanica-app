import { PartSupply } from '@domain/entities/part-supply.entity';
import { UpdateStockDto } from '@domain/interfaces/use-cases/part-supply/dto/update-stock.dto';

export interface IUpdateStockUseCase {
  execute(id: string, input: UpdateStockDto): Promise<PartSupply>;
}
