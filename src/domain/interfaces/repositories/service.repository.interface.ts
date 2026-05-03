import { Service } from '../../entities/service.entity';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '../common/pagination.interface';

export interface ServiceFilters {
  name?: string;
}

export interface ServiceMetrics {
  serviceId: string;
  serviceName: string;
  executionCount: number;
  averageTimeMinutes: number | null;
}

export interface IServiceRepository {
  create(service: Service): Promise<Service>;
  findById(id: string): Promise<Service | null>;
  findByName(name: string): Promise<Service | null>;
  findAllPaginated(
    pagination: PaginationInput,
    filters: ServiceFilters,
  ): Promise<PaginatedRepositoryResult<Service>>;
  update(id: string, data: Partial<Service>): Promise<Service>;
  delete(id: string): Promise<void>;
  hasWorkOrderServices(serviceId: string): Promise<boolean>;
  hasQuoteServices(serviceId: string): Promise<boolean>;
  findServiceMetrics(serviceId: string): Promise<ServiceMetrics>;
  findAllServicesMetrics(input: PaginationInput): Promise<PaginatedRepositoryResult<ServiceMetrics>>;
}
