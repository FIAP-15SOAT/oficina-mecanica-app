import { Vehicle } from '@domain/entities/vehicle.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { IFindVehiclesByCustomerIdUseCase } from '@application/ports/input/vehicle/find-vehicles-by-customer-id.use-case.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class FindVehiclesByCustomerIdUseCase implements IFindVehiclesByCustomerIdUseCase {
  constructor(
    private readonly vehicleRepository: IVehicleRepository,
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(customerId: string): Promise<Vehicle[]> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', customerId);
    }

    return this.vehicleRepository.findAllByCustomerId(customerId);
  }
}
