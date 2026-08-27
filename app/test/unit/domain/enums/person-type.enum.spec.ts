import { PersonType } from '@domain/enums/person-type.enum';

describe('PersonType', () => {
  it('exposes INDIVIDUAL and COMPANY values', () => {
    expect(PersonType.INDIVIDUAL).toBe('INDIVIDUAL');
    expect(PersonType.COMPANY).toBe('COMPANY');
  });
});
