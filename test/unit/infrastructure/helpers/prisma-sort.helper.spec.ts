import { toPrismaOrderBy } from '@infrastructure/database/prisma/helpers/prisma-sort.helper';
import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';

describe('toPrismaOrderBy', () => {
  it('should convert single criterion to prisma orderBy', () => {
    const criteria = [new SortCriterion('status', SortDirection.DESC)];
    expect(toPrismaOrderBy(criteria)).toEqual([{ status: 'desc' }]);
  });

  it('should convert single criterion with ASC direction', () => {
    const criteria = [new SortCriterion('createdAt', SortDirection.ASC)];
    expect(toPrismaOrderBy(criteria)).toEqual([{ createdAt: 'asc' }]);
  });

  it('should convert multiple criteria', () => {
    const criteria = [
      new SortCriterion('status', SortDirection.DESC),
      new SortCriterion('createdAt', SortDirection.ASC),
    ];
    expect(toPrismaOrderBy(criteria)).toEqual([{ status: 'desc' }, { createdAt: 'asc' }]);
  });

  it('should return empty array for empty input', () => {
    expect(toPrismaOrderBy([])).toEqual([]);
  });
});
