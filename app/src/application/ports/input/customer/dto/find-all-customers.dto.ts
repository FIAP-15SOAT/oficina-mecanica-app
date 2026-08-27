import { PersonType } from '@domain/enums/person-type.enum';
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';

export interface FindAllCustomersInputDto extends PaginationInput {
  name?: string;
  type?: PersonType;
  document?: string;
}
