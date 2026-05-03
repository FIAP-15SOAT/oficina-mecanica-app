import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { FindAllPartsSuppliesInputDto } from '@domain/interfaces/use-cases/part-supply/dto/find-all-parts-supplies.dto';

export interface IFindAllPartsSuppliesUseCase {
  execute(input: FindAllPartsSuppliesInputDto): Promise<PaginatedResult<PartSupply>>;
}
