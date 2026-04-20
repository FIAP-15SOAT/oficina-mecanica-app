import { IServiceRepository } from '../../../domain/interfaces';
import { calculateTotalPages } from 'src/application/utils/calculate-total-pages.util';
import { FindAllServicesPaginatedDto } from './dto/find-all-services-paginated.dto';

export class FindAllServicesPaginatedUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(
    page: number,
    pageSize: number,
    activeOnly: boolean = true,
  ): Promise<FindAllServicesPaginatedDto> {
    const { services, total } = await this.serviceRepository.findAllPaginated(
      page,
      pageSize,
      activeOnly,
    );

    return {
      services,
      totalRecords: total,
      totalPages: calculateTotalPages(total, pageSize),
    };
  }
}
