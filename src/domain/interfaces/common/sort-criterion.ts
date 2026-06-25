import { SortDirection } from '@domain/enums/sort-direction.enum';

export interface SortCriterion {
  field: string;
  direction: SortDirection;
}
