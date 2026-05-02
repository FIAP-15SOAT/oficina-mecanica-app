import { Service } from '@domain/entities/service.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { ServiceMetrics } from '@domain/interfaces/repositories/service.repository.interface';
import { ServicePaginatedResponseDto } from './dto/service-paginated-response.dto';
import { ServiceDataResponseDto } from './dto/service-response.dto';
import { ServiceMetricsDataResponseDto, ServiceMetricsPaginatedResponseDto } from './dto/service-metrics-response.dto';

export class ServicePresenter {
  static toDataResponse(service: Service): ServiceDataResponseDto {
    return { data: service };
  }

  static toPaginatedDataResponse(result: PaginatedResult<Service>): ServicePaginatedResponseDto {
    return {
      data: result.items,
      pagination: result.pagination,
    };
  }

  static toMetricsDataResponse(metrics: ServiceMetrics): ServiceMetricsDataResponseDto {
    return { data: metrics };
  }

  static toMetricsPaginatedDataResponse(result: PaginatedResult<ServiceMetrics>): ServiceMetricsPaginatedResponseDto {
    return {
      data: result.items,
      pagination: result.pagination,
    };
  }
}
