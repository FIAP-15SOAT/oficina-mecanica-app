import { CustomerType } from '@domain/enums/customer-type.enum';
import { PaginationQuery } from '@domain/interfaces/common/pagination.interface';

export interface FindAllCustomersQuery extends PaginationQuery {
  name?: string;
  type?: CustomerType;
  document?: string;
}
