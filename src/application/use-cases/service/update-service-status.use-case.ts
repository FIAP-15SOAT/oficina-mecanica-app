import { Service } from '../../../domain/entities';
import { IServiceRepository } from '../../../domain/interfaces';
import { ResourceNotFoundException } from '../../exceptions';

export class UpdateServiceStatusUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(id: string, active: boolean): Promise<Service> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new ResourceNotFoundException('Serviço', id);
    }

    service.setActive(active);

    return this.serviceRepository.update(id, service);
  }
}