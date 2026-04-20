import { ResourceConflictException } from 'src/application/exceptions';
import { Service } from '../../../domain/entities';
import { IServiceRepository } from '../../../domain/interfaces';
import { CreateServiceDto } from './dto/create-service.dto';

export class CreateServiceUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(createServiceDto: CreateServiceDto): Promise<Service> {
    const existingService = await this.serviceRepository.findByName(createServiceDto.name);

    if (existingService) {
      throw new ResourceConflictException('Serviço já cadastrado');
    }

    return await this.serviceRepository.create(
      Service.create({
        name: createServiceDto.name,
        description: createServiceDto.description,
        basePrice: createServiceDto.basePrice,
        estimatedTimeMin: createServiceDto.estimatedTimeMin,
      }),
    );
  }
}
