import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { IStockReservationRepository } from '@domain/interfaces/repositories/stock-reservation.repository.interface';
import { IFindStockReservationsUseCase } from '@domain/interfaces/use-cases/reporting/find-stock-reservations.use-case.interface';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';

import { FindStockReservationsInputDto } from '@domain/interfaces/use-cases/reporting/dto/find-stock-reservations.dto';

export class FindStockReservationsUseCase implements IFindStockReservationsUseCase {
  constructor(private readonly stockReservationRepository: IStockReservationRepository) { }

  async execute(input: FindStockReservationsInputDto): Promise<PaginatedResult<StockReservation>> {
    const { page, limit, ...filters } = input;
    const pagination: PaginationInput = { page, limit };

    const result = await this.stockReservationRepository.findAllPaginated(pagination, filters);

    return buildPaginatedResult(result, pagination);
  }
}
