import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { IFindPartSupplyByIdUseCase } from '@domain/interfaces/use-cases/part-supply/find-part-supply-by-id.use-case.interface';

export class FindPartSupplyByIdUseCase implements IFindPartSupplyByIdUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) {}

  async execute(id: string): Promise<PartSupply> {
    const partSupply = await this.partSupplyRepository.findById(id);

    if (!partSupply) {
      throw new ResourceNotFoundException('Peça ou Insumo', id);
    }

    return partSupply;
  }
}
