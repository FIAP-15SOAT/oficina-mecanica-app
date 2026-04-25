import { NotFoundException } from '@nestjs/common';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { IFindVehiclesByCustomerIdUseCase } from '@domain/interfaces/use-cases/vehicle/find-vehicles-by-customer-id.use-case.interface';
import { FindAllVehiclesOutputDto } from '@domain/interfaces/use-cases/vehicle/dto/find-all-vehicles.dto';

export class FindVehiclesByCustomerIdUseCase implements IFindVehiclesByCustomerIdUseCase {
  constructor(
    private readonly vehicleRepository: IVehicleRepository,
    private readonly customerRepository: ICustomerRepository,
  ) {}

  async execute(customerId: string, input: { page: number; limit: number }): Promise<FindAllVehiclesOutputDto> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) throw new NotFoundException(`Cliente com ID ${customerId} não encontrado.`);

    const { items, total } = await this.vehicleRepository.findAllPaginated({
      customerId,
      page: input.page,
      limit: input.limit,
    });

    return {
      items,
      pagination: {
        totalRecords: total,
        totalPages: Math.ceil(total / input.limit),
        page: input.page,
        limit: input.limit,
      },
    };
  }
}
