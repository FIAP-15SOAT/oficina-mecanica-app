import { Service } from '@domain/entities/service.entity';
import { CreateServiceDto } from '@domain/interfaces/use-cases/service/dto/create-service.dto';

export interface ICreateServiceUseCase {
  execute(input: CreateServiceDto): Promise<Service>;
}
