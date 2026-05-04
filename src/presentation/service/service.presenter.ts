import { Service } from '@domain/entities/service.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { ServicePaginatedResponseDto } from './dto/service-paginated-response.dto';
import { ServiceDataResponseDto } from './dto/service-response.dto';

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
}
