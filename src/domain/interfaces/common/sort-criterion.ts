import { SortDirection } from '@domain/enums/sort-direction.enum';

export class SortCriterion {
  constructor(
    readonly field: string,
    readonly direction: SortDirection,
  ) {}
}
