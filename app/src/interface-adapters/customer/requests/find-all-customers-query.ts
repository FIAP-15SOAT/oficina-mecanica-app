import { PersonType } from '@domain/enums/person-type.enum';
import { PaginationQuery } from '@domain/interfaces/common/pagination.interface';

export interface FindAllCustomersQuery extends PaginationQuery {
  name?: string;
  type?: PersonType;
  document?: string;
}
