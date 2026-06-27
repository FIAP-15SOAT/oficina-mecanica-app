import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';

export function toPrismaOrderBy(criteria: SortCriterion[]): Record<string, SortDirection>[] {
  return criteria.map((c) => ({ [c.field]: c.direction }));
}
