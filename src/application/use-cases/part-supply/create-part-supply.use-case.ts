import { PartSupply } from '@domain/entities/part-supply.entity';
import { DuplicateSkuException } from '@domain/exceptions/duplicate-sku.exception';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { CreatePartSupplyDto } from '@domain/interfaces/use-cases/part-supply/dto/create-part-supply.dto';
import { ICreatePartSupplyUseCase } from '@domain/interfaces/use-cases/part-supply/create-part-supply.use-case.interface';

export class CreatePartSupplyUseCase implements ICreatePartSupplyUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) {}

  async execute(input: CreatePartSupplyDto): Promise<PartSupply> {
    const existing = await this.partSupplyRepository.findBySku(input.sku);
    if (existing) {
      throw new DuplicateSkuException(input.sku);
    }
    const partSupply = PartSupply.create(input);
    return this.partSupplyRepository.create(partSupply);
  }
}
