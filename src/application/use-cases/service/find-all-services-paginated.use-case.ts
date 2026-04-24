import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import {
  FindAllServicesPaginatedDto,
  FindAllServicesPaginatedInputDto,
} from '@domain/interfaces/use-cases/service/dto/find-all-services-paginated.dto';
import { calculateTotalPages } from '@application/utils/calculate-total-pages.util';

export class FindAllServicesPaginatedUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(input: FindAllServicesPaginatedInputDto): Promise<FindAllServicesPaginatedDto> {
    const { items, total } = await this.serviceRepository.findAllPaginated(input);

    return {
      items,
      pagination: {
        totalRecords: total,
        totalPages: calculateTotalPages(total, input.limit),
        page: input.page,
        limit: input.limit,
      },
    };
  }
}
