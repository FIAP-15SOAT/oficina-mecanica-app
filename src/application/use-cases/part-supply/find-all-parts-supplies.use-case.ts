import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import {
  FindAllPartsSuppliesInputDto,
  FindAllPartsSuppliesOutputDto,
} from '@domain/interfaces/use-cases/part-supply/dto/find-all-parts-supplies.dto';
import { IFindAllPartsSuppliesUseCase } from '@domain/interfaces/use-cases/part-supply/find-all-parts-supplies.use-case.interface';

export class FindAllPartsSuppliesUseCase implements IFindAllPartsSuppliesUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) {}

  async execute(input: FindAllPartsSuppliesInputDto): Promise<FindAllPartsSuppliesOutputDto> {
    const { items, total } = await this.partSupplyRepository.findAll(input);
    return { items, total, page: input.page, limit: input.limit };
  }
}
