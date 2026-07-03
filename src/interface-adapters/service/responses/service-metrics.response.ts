import { PaginationMeta } from '@domain/interfaces/common/pagination.interface';

export interface ServiceMetricsResponse {
  serviceId: string;
  serviceName: string;
  executionCount: number;
  averageTimeMinutes: number | null;
}

export interface ServiceMetricsDataResponse {
  data: ServiceMetricsResponse;
}

export interface ServiceMetricsPaginatedResponse {
  data: ServiceMetricsResponse[];
  pagination: PaginationMeta;
}
