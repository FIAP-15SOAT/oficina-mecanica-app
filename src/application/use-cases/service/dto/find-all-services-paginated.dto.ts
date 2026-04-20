import { Service } from '../../../../domain/entities';

export interface FindAllServicesPaginatedDto {
  services: Service[];
  totalRecords: number;
  totalPages: number;
}
