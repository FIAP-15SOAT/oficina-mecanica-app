import { PartSupply } from '@domain/entities/part-supply.entity';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import { FindAllPartsSuppliesInputDto } from '@domain/interfaces/use-cases/part-supply/dto/find-all-parts-supplies.dto';
import { IFindAllPartsSuppliesUseCase } from '@domain/interfaces/use-cases/part-supply/find-all-parts-supplies.use-case.interface';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';

export class FindAllPartsSuppliesUseCase implements IFindAllPartsSuppliesUseCase {
  constructor(private readonly partSupplyRepository: IPartSupplyRepository) { }

  async execute(input: FindAllPartsSuppliesInputDto): Promise<PaginatedResult<PartSupply>> {
    const { page, limit, ...filters } = input;
    const pagination: PaginationInput = { page, limit };

    const result = await this.partSupplyRepository.findAllPaginated(pagination, filters);

    return buildPaginatedResult(result, pagination);
  }
}
