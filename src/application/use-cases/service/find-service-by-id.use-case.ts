import { Service } from '../../../domain/entities';
import { IServiceRepository } from '../../../domain/interfaces';
import { ResourceNotFoundException } from '../../exceptions';

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
