import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { ServiceMetrics } from '@domain/interfaces/repositories/service.repository.interface';
import { ServiceMetricsDataResponseDto, ServiceMetricsPaginatedResponseDto } from './dto/service-metrics-response.dto';

export class ServiceMetricsPresenter {
  static toDataResponse(metrics: ServiceMetrics): ServiceMetricsDataResponseDto {
    return { data: metrics };
  }

  static toPaginatedDataResponse(result: PaginatedResult<ServiceMetrics>): ServiceMetricsPaginatedResponseDto {
    return {
      data: result.items,
      pagination: result.pagination,
    };
  }
}
