import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { IDeletePartSupplyUseCase } from '@domain/interfaces/use-cases/part-supply/delete-part-supply.use-case.interface';

export class DeletePartSupplyUseCase implements IDeletePartSupplyUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.partSupplyRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException('Peça ou Insumo', id);
    }
    await this.partSupplyRepository.softDelete(id);
  }
}
