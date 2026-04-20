import { Service } from '@domain/entities/service.entity';

export interface FindAllServicesPaginatedDto {
  services: Service[];
  totalRecords: number;
  totalPages: number;
}
