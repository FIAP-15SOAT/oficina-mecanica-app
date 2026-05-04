import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';

import { PaginationInput } from '@domain/interfaces/common/pagination.interface';

export interface FindAllCustomersInputDto extends PaginationInput {
  name?: string;
  type?: CustomerType;
  document?: string;
}
