import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { FindAllServicesPaginatedDto } from '@domain/interfaces/use-cases/service/dto/find-all-services-paginated.dto';
import { calculateTotalPages } from '@application/utils/calculate-total-pages.util';

export class FindAllServicesPaginatedUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(
    page: number,
    pageSize: number,
    active?: boolean,
  ): Promise<FindAllServicesPaginatedDto> {
    const { services, total } = await this.serviceRepository.findAllPaginated(
      page,
      pageSize,
      active,
    );

    return {
      services,
      totalRecords: total,
      totalPages: calculateTotalPages(total, pageSize),
    };
  }
}
