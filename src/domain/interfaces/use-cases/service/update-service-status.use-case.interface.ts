import { Service } from '@domain/entities/service.entity';

export interface IUpdateServiceStatusUseCase {
  execute(id: string, active: boolean): Promise<Service>;
}
