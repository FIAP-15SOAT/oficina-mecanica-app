import { PartSupply } from '@domain/entities/part-supply.entity';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { PartSupplyNotFoundException } from '@domain/exceptions/part-supply-not-found.exception';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { UpdateStockDto } from '@domain/interfaces/use-cases/part-supply/dto/update-stock.dto';
import { IUpdateStockUseCase } from '@domain/interfaces/use-cases/part-supply/update-stock.use-case.interface';

export class UpdateStockUseCase implements IUpdateStockUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) {}

  async execute(id: string, input: UpdateStockDto): Promise<PartSupply> {
    const partSupply = await this.partSupplyRepository.findById(id);
    if (!partSupply) {
      throw new PartSupplyNotFoundException(id);
    }
    if (input.type === StockMovementType.EXIT && input.quantity > partSupply.stock) {
      throw new InsufficientStockException(id, input.quantity, partSupply.stock);
    }
    return this.partSupplyRepository.updateStock(
      id,
      input.quantity,
      input.type,
      input.reason,
      input.workOrderId,
    );
  }
}
