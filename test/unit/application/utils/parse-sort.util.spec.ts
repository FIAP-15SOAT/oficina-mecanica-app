import { parseSort } from '@application/utils/parse-sort.util';
import { SortDirection } from '@domain/enums/sort-direction.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('parseSort', () => {
  it('should return empty array for undefined input', () => {
    expect(parseSort(undefined)).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    expect(parseSort('')).toEqual([]);
    expect(parseSort('   ')).toEqual([]);
  });

  it('should parse single criterion', () => {
    const result = parseSort('status:desc');
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('status');
    expect(result[0].direction).toBe(SortDirection.DESC);
  });

  it('should parse multiple criteria', () => {
    const result = parseSort('status:desc,createdAt:asc');
    expect(result).toHaveLength(2);
    expect(result[0].field).toBe('status');
    expect(result[0].direction).toBe(SortDirection.DESC);
    expect(result[1].field).toBe('createdAt');
    expect(result[1].direction).toBe(SortDirection.ASC);
  });

  it('should default direction to asc when omitted', () => {
    const result = parseSort('createdAt');
    expect(result[0].direction).toBe(SortDirection.ASC);
  });

  it('should be case-insensitive for direction', () => {
    const result = parseSort('status:DESC');
    expect(result[0].direction).toBe(SortDirection.DESC);
  });

  it('should trim whitespace around parts', () => {
    const result = parseSort(' status : desc , createdAt : asc ');
    expect(result).toHaveLength(2);
    expect(result[0].field).toBe('status');
    expect(result[1].field).toBe('createdAt');
  });

  it('should throw DomainValidationException for invalid direction', () => {
    expect(() => parseSort('status:invalid')).toThrow(DomainValidationException);
  });

  it('should throw DomainValidationException for empty field', () => {
    expect(() => parseSort(':desc')).toThrow(DomainValidationException);
  });
});
