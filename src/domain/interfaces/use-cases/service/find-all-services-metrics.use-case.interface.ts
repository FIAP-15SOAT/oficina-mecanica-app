import { ServiceMetrics } from '@domain/interfaces/repositories/service.repository.interface';
import {
  PaginatedResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';

export interface IFindAllServicesMetricsUseCase {
  execute(input: PaginationInput): Promise<PaginatedResult<ServiceMetrics>>;
}
