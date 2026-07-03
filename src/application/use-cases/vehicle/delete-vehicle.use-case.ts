import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { IDeleteVehicleUseCase } from '@application/ports/input/vehicle/delete-vehicle.use-case.interface';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class DeleteVehicleUseCase implements IDeleteVehicleUseCase {
  constructor(private readonly vehicleRepository: IVehicleRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.vehicleRepository.findById(id);

    if (!existing) {
      throw new ResourceNotFoundException('Veículo', id);
    }

    const inUse = await this.vehicleRepository.isVehicleInUse(id);

    if (inUse) {
      throw new ResourceConflictException(
        'Veículo possui ordens de serviço e não pode ser excluído.',
      );
    }
    await this.vehicleRepository.delete(id);
  }
}
