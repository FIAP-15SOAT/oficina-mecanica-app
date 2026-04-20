import { Service } from '../../entities/service.entity';

export interface PaginatedServicesDto {
  services: Service[];
  total: number;
}

export interface IServiceRepository {
  create(service: Service): Promise<Service>;
  findById(id: string): Promise<Service | null>;
  findByName(name: string): Promise<Service | null>;
  findAllPaginated(page: number, pageSize: number, active?: boolean): Promise<PaginatedServicesDto>;
  update(id: string, data: Partial<Service>): Promise<Service>;
  delete(id: string): Promise<void>;
}
