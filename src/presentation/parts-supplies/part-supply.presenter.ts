import { PartSupply } from '@domain/entities/part-supply.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { PartSupplyPaginatedResponseDto } from './dto/part-supply-paginated-response.dto';
import { PartSupplyDataResponseDto } from './dto/part-supply-response.dto';

export class PartSupplyPresenter {
  static toDataResponse(partSupply: PartSupply): PartSupplyDataResponseDto {
    return { data: partSupply };
  }

  static toPaginatedDataResponse(
    result: PaginatedResult<PartSupply>,
  ): PartSupplyPaginatedResponseDto {
    return {
      data: result.items,
      pagination: result.pagination,
    };
  }
}
