import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { IDeletePartSupplyUseCase } from '@domain/interfaces/use-cases/part-supply/delete-part-supply.use-case.interface';

export class DeletePartSupplyUseCase implements IDeletePartSupplyUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.partSupplyRepository.findById(id);

    if (!existing) {
      throw new ResourceNotFoundException('Peça ou Insumo', id);
    }

    existing.ensureCanDelete();

    const inUse = await this.partSupplyRepository.isPartSupplyInUse(id);

    if (inUse) {
      throw new ResourceConflictException(
        'Peça ou insumo não pode ser excluído pois está vinculado a ordens de serviço ou orçamentos.',
      );
    }

    await this.partSupplyRepository.delete(id);
  }
}
