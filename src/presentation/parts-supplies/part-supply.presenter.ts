import { PartSupply } from '@domain/entities/part-supply.entity';
import { FindAllPartsSuppliesOutputDto } from '@domain/interfaces/use-cases/part-supply/dto/find-all-parts-supplies.dto';
import { PartSupplyPaginatedResponseDto } from './dto/part-supply-paginated-response.dto';
import { PartSupplyDataResponseDto } from './dto/part-supply-response.dto';

export class PartSupplyPresenter {
  static toDataResponse(partSupply: PartSupply): PartSupplyDataResponseDto {
    return { data: partSupply };
  }

  static toPaginatedDataResponse(result: FindAllPartsSuppliesOutputDto): PartSupplyPaginatedResponseDto {
    return {
      data: result.items,
      totalRecords: result.totalRecords,
      totalPages: result.totalPages,
      page: result.page,
      limit: result.limit,
    };
  }
}
