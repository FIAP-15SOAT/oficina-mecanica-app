import { Service } from '@domain/entities/service.entity';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class FindServiceByIdUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(id: string): Promise<Service> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new ResourceNotFoundException('Serviço', id);
    }

    return service;
  }
}
