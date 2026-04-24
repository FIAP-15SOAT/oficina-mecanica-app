import {
  FindAllServicesPaginatedDto,
  FindAllServicesPaginatedInputDto,
} from '@domain/interfaces/use-cases/service/dto/find-all-services-paginated.dto';

export interface IFindAllServicesPaginatedUseCase {
  execute(input: FindAllServicesPaginatedInputDto): Promise<FindAllServicesPaginatedDto>;
}
