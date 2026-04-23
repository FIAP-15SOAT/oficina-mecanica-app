import {
  FindAllPartsSuppliesInputDto,
  FindAllPartsSuppliesOutputDto,
} from '@domain/interfaces/use-cases/part-supply/dto/find-all-parts-supplies.dto';

export interface IFindAllPartsSuppliesUseCase {
  execute(input: FindAllPartsSuppliesInputDto): Promise<FindAllPartsSuppliesOutputDto>;
}
