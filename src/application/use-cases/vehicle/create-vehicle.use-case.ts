import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { CreateVehicleDto } from '@domain/interfaces/use-cases/vehicle/dto/create-vehicle.dto';
import { ICreateVehicleUseCase } from '@domain/interfaces/use-cases/vehicle/create-vehicle.use-case.interface';

export class CreateVehicleUseCase implements ICreateVehicleUseCase {
  constructor(
    private readonly vehicleRepository: IVehicleRepository,
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(input: CreateVehicleDto): Promise<Vehicle> {
    const customer = await this.customerRepository.findById(input.customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', input.customerId);
    }

    const sanitizedPlate = input.plate.trim().toUpperCase().replace(/-/g, '');
    const existingByPlate = await this.vehicleRepository.findByPlate(sanitizedPlate);

    if (existingByPlate) {
      throw new ResourceConflictException(`Placa '${sanitizedPlate}' já está cadastrada.`);
    }

    const vehicle = Vehicle.create({
      ...input,
      plate: sanitizedPlate,
    });

    return this.vehicleRepository.create(vehicle);
  }
}
