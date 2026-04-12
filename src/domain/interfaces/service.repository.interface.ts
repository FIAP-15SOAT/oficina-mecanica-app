import { Service } from '../entities';

export interface IServiceRepository {
  create(service: Service): Promise<Service>;
  findById(id: string): Promise<Service | null>;
  findAll(activeOnly?: boolean): Promise<Service[]>;
  update(id: string, data: Partial<Service>): Promise<Service>;
  delete(id: string): Promise<void>;
}
