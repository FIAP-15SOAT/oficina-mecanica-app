import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { FindAllVehiclesInputDto } from '@domain/interfaces/use-cases/vehicle/dto/find-all-vehicles.dto';
import { IFindAllVehiclesUseCase } from '@domain/interfaces/use-cases/vehicle/find-all-vehicles.use-case.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';

export class FindAllVehiclesUseCase implements IFindAllVehiclesUseCase {
  constructor(private readonly vehicleRepository: IVehicleRepository) { }

  async execute(input: FindAllVehiclesInputDto): Promise<PaginatedResult<Vehicle>> {
    const { page, limit, ...filters } = input;
    const pagination: PaginationInput = { page, limit };

    const result = await this.vehicleRepository.findAllPaginated(pagination, filters);

    return buildPaginatedResult(result, pagination);
  }
}
