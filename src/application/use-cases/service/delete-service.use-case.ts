import { IServiceRepository } from '../../../domain/interfaces';
import { ResourceNotFoundException } from '../../exceptions';

export class DeleteServiceUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(id: string): Promise<void> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new ResourceNotFoundException('Serviço', id);
    }

    await this.serviceRepository.delete(id);
  }
}
