import { CustomerType } from '@domain/enums/customer-type.enum';
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';

export interface FindAllCustomersInputDto extends PaginationInput {
  name?: string;
  type?: CustomerType;
  document?: string;
  isActive?: boolean;
}
