import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { UpdateStockDto } from '@domain/interfaces/use-cases/part-supply/dto/update-stock.dto';
import { IUpdateStockUseCase } from '@domain/interfaces/use-cases/part-supply/update-stock.use-case.interface';

export class UpdateStockUseCase implements IUpdateStockUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) {}

  async execute(id: string, input: UpdateStockDto): Promise<PartSupply> {
    const partSupply = await this.partSupplyRepository.findById(id);
    if (!partSupply) {
      throw new ResourceNotFoundException('Peça ou Insumo', id);
    }
    if (input.type === StockMovementType.EXIT && input.quantity > partSupply.stock) {
      throw new ResourceConflictException(
        `Estoque insuficiente. Solicitado: ${input.quantity}, disponível: ${partSupply.stock}.`,
      );
    }
    return this.partSupplyRepository.updateStock(id, input);
  }
}
