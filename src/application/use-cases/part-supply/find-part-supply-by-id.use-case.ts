import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyNotFoundException } from '@domain/exceptions/part-supply-not-found.exception';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { IFindPartSupplyByIdUseCase } from '@domain/interfaces/use-cases/part-supply/find-part-supply-by-id.use-case.interface';

export class FindPartSupplyByIdUseCase implements IFindPartSupplyByIdUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) {}

  async execute(id: string): Promise<PartSupply> {
    const partSupply = await this.partSupplyRepository.findById(id);
    if (!partSupply) {
      throw new PartSupplyNotFoundException(id);
    }
    return partSupply;
  }
}
