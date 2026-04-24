import { Service } from '../../entities/service.entity';

export interface ServiceFilters {
  page: number;
  limit: number;
  active?: boolean;
  name?: string;
}

export interface PaginatedServicesDto {
  items: Service[];
  total: number;
}

export interface IServiceRepository {
  create(service: Service): Promise<Service>;
  findById(id: string): Promise<Service | null>;
  findByName(name: string): Promise<Service | null>;
  findAllPaginated(filters: ServiceFilters): Promise<PaginatedServicesDto>;
  update(id: string, data: Partial<Service>): Promise<Service>;
  delete(id: string): Promise<void>;
}
