import { calculateTotalPages } from '@application/utils/calculate-total-pages.util';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import {
  FindAllVehiclesInputDto,
  FindAllVehiclesOutputDto,
} from '@domain/interfaces/use-cases/vehicle/dto/find-all-vehicles.dto';
import { IFindAllVehiclesUseCase } from '@domain/interfaces/use-cases/vehicle/find-all-vehicles.use-case.interface';

export class FindAllVehiclesUseCase implements IFindAllVehiclesUseCase {
  constructor(private readonly vehicleRepository: IVehicleRepository) {}

  async execute(input: FindAllVehiclesInputDto): Promise<FindAllVehiclesOutputDto> {
    const { items, total } = await this.vehicleRepository.findAll(input);
    return {
      items,
      pagination: {
        totalRecords: total,
        totalPages: calculateTotalPages(total, input.limit),
        page: input.page,
        limit: input.limit,
      },
    };
  }
}
