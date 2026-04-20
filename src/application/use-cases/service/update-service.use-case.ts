import { Service } from '../../../domain/entities';
import { IServiceRepository } from '../../../domain/interfaces';
import { ResourceConflictException, ResourceNotFoundException } from '../../exceptions';
import { UpdateServiceDto } from './dto/update-service.dto';

export class UpdateServiceUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new ResourceNotFoundException('Serviço', id);
    }

    const existingServiceWithName = await this.serviceRepository.findByName(updateServiceDto.name);

    if (existingServiceWithName && existingServiceWithName.id !== id) {
      throw new ResourceConflictException('Outro serviço com o mesmo nome já existe');
    }

    const updatedService = Service.create({
      name: updateServiceDto.name,
      description: updateServiceDto.description,
      basePrice: updateServiceDto.basePrice,
      estimatedTimeMin: updateServiceDto.estimatedTimeMin,
      isActive: updateServiceDto.isActive,
    });

    return this.serviceRepository.update(id, updatedService);
  }
}
