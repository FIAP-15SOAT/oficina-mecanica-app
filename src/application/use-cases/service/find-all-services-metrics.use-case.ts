import {
  ServiceMetrics,
  IServiceRepository,
} from '@domain/interfaces/repositories/service.repository.interface';
import { IFindAllServicesMetricsUseCase } from '@application/ports/input/service/find-all-services-metrics.use-case.interface';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';

export class FindAllServicesMetricsUseCase implements IFindAllServicesMetricsUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(input: PaginationInput): Promise<PaginatedResult<ServiceMetrics>> {
    const result = await this.serviceRepository.findAllServicesMetrics(input);
    return buildPaginatedResult(result, input);
  }
}
