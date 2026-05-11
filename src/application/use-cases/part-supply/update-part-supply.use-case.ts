import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { UpdatePartSupplyDto } from '@domain/interfaces/use-cases/part-supply/dto/update-part-supply.dto';
import { IUpdatePartSupplyUseCase } from '@domain/interfaces/use-cases/part-supply/update-part-supply.use-case.interface';

export class UpdatePartSupplyUseCase implements IUpdatePartSupplyUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) {}

  async execute(id: string, input: UpdatePartSupplyDto): Promise<PartSupply> {
    const existing = await this.partSupplyRepository.findById(id);

    if (!existing) {
      throw new ResourceNotFoundException('Peça ou Insumo', id);
    }

    if (input.sku && input.sku !== existing.sku) {
      const withSameSku = await this.partSupplyRepository.findBySku(input.sku);

      if (withSameSku) {
        throw new ResourceConflictException(`SKU '${input.sku}' já está em uso.`);
      }
    }

    existing.update(input);

    return this.partSupplyRepository.update(existing);
  }
}
