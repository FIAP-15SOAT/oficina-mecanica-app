import { PaginationInput } from '@domain/interfaces/common/pagination.interface';

export interface FindAllServicesPaginatedInputDto extends PaginationInput {
  active?: boolean;
  name?: string;
}
