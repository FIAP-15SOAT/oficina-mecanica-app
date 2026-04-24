import { Service } from '@domain/entities/service.entity';

export interface FindAllServicesPaginatedInputDto {
  page: number;
  limit: number;
  active?: boolean;
  name?: string;
}

export interface FindAllServicesPaginationDto {
  totalRecords: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface FindAllServicesPaginatedDto {
  items: Service[];
  pagination: FindAllServicesPaginationDto;
}
