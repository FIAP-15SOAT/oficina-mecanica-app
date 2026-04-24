import { Service } from '@domain/entities/service.entity';
import { FindAllServicesPaginatedDto } from '@domain/interfaces/use-cases/service/dto/find-all-services-paginated.dto';
import { ServicePaginatedResponseDto } from './dto/service-paginated-response.dto';
import { ServiceDataResponseDto } from './dto/service-response.dto';

export class ServicePresenter {
  static toDataResponse(service: Service): ServiceDataResponseDto {
    return { data: service };
  }

  static toPaginatedDataResponse(result: FindAllServicesPaginatedDto): ServicePaginatedResponseDto {
    return {
      data: result.items,
      pagination: result.pagination,
    };
  }
}
