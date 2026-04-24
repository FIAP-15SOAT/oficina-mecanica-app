import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';

export interface FindAllCustomersInputDto {
  page: number;
  limit: number;
  name?: string;
  type?: CustomerType;
  document?: string;
}

export interface FindAllCustomersPaginationDto {
  totalRecords: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface FindAllCustomersOutputDto {
  items: Customer[];
  pagination: FindAllCustomersPaginationDto;
}
