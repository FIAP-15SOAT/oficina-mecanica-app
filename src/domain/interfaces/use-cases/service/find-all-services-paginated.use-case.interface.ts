import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { Service } from '@domain/entities/service.entity';
import { FindAllServicesPaginatedInputDto } from '@domain/interfaces/use-cases/service/dto/find-all-services-paginated.dto';

export interface IFindAllServicesPaginatedUseCase {
  execute(input: FindAllServicesPaginatedInputDto): Promise<PaginatedResult<Service>>;
}
