import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { UpdateVehicleDto } from '@domain/interfaces/use-cases/vehicle/dto/update-vehicle.dto';
import { IUpdateVehicleUseCase } from '@domain/interfaces/use-cases/vehicle/update-vehicle.use-case.interface';

export class UpdateVehicleUseCase implements IUpdateVehicleUseCase {
  constructor(
    private readonly vehicleRepository: IVehicleRepository,
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(id: string, input: UpdateVehicleDto): Promise<Vehicle> {
    const existing = await this.vehicleRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException('Veículo', id);
    }
    if (input.customerId !== existing.customerId) {
      const customer = await this.customerRepository.findById(input.customerId);
      if (!customer) {
        throw new ResourceNotFoundException('Cliente', input.customerId);
      }
    }
    const plate = input.plate.trim().toUpperCase();
    if (plate !== existing.plate) {
      const byPlate = await this.vehicleRepository.findByPlate(plate);
      if (byPlate) {
        throw new ResourceConflictException(`Placa '${plate}' já está cadastrada.`);
      }
    }
    return this.vehicleRepository.update(id, { ...input, plate });
  }
}
