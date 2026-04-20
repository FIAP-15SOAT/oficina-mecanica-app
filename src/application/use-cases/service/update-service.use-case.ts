import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { Service } from '@domain/entities/service.entity';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UpdateServiceDto } from '@domain/interfaces/use-cases/service/dto/update-service.dto';

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

    Object.assign(service, updatedService);

    return this.serviceRepository.update(id, service);
  }
}
