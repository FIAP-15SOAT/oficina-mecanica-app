import { SortCriterion } from '@domain/interfaces/common/sort-criterion';

export function toPrismaOrderBy(criteria: SortCriterion[]): Record<string, string>[] {
  return criteria.map((c) => ({ [c.field]: c.direction }));
}
