import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { UpdateStockDto } from '@domain/interfaces/use-cases/part-supply/dto/update-stock.dto';
import { IUpdateStockUseCase } from '@domain/interfaces/use-cases/part-supply/update-stock.use-case.interface';

export class UpdateStockUseCase implements IUpdateStockUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(id: string, input: UpdateStockDto): Promise<PartSupply> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const partSupply = await repos.partSupply.findById(id);

      if (!partSupply) {
        throw new ResourceNotFoundException('Peça ou Insumo', id);
      }

      partSupply.applyStockMovement(input.type, input.quantity);

      const movement = StockMovement.create({
        partSupplyId: id,
        workOrderId: input.workOrderId ?? null,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason ?? null,
      });

      await Promise.all([
        repos.partSupply.update(id, partSupply),
        repos.stockMovement.create(movement),
      ]);

      return partSupply;
    });
  }
}
