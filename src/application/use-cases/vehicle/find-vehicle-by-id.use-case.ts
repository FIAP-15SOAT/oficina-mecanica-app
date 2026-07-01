import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { IFindVehicleByIdUseCase } from '@application/ports/input/vehicle/find-vehicle-by-id.use-case.interface';

export class FindVehicleByIdUseCase implements IFindVehicleByIdUseCase {
  constructor(private readonly vehicleRepository: IVehicleRepository) {}

  async execute(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findById(id);
    if (!vehicle) {
      throw new ResourceNotFoundException('Veículo', id);
    }
    return vehicle;
  }
}
