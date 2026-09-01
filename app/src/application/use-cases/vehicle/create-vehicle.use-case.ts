import { Vehicle } from '@domain/entities/vehicle.entity';
import { Plate } from '@domain/value-objects/plate.vo';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';

import { ICreateVehicleUseCase } from '@application/ports/input/vehicle/create-vehicle.use-case.interface';
import { CreateVehicleDto } from '@application/ports/input/vehicle/dto/create-vehicle.dto';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

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

    if (!customer.isActive) {
      throw new BusinessRuleViolationException(
        'Não é possível cadastrar veículo para um cliente inativo.',
      );
    }

    const plate = Plate.create(input.plate);
    const existingByPlate = await this.vehicleRepository.findByPlate(plate.value);

    if (existingByPlate) {
      throw new ResourceConflictException(`Placa '${plate.value}' já está cadastrada.`);
    }

    const vehicle = Vehicle.create(input);

    return this.vehicleRepository.create(vehicle);
  }
}
