import { FindAllServicesPaginatedDto } from '@domain/interfaces/use-cases/service/dto/find-all-services-paginated.dto';

export interface IFindAllServicesPaginatedUseCase {
  execute(page: number, pageSize: number, active?: boolean): Promise<FindAllServicesPaginatedDto>;
}
