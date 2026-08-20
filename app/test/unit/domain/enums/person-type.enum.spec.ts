import { PersonType } from '@domain/enums/person-type.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';

describe('PersonType / CustomerType', () => {
  it('CustomerType is a re-export of PersonType (same enum object)', () => {
    expect(CustomerType).toBe(PersonType);
  });

  it('exposes INDIVIDUAL and COMPANY values', () => {
    expect(PersonType.INDIVIDUAL).toBe('INDIVIDUAL');
    expect(PersonType.COMPANY).toBe('COMPANY');
  });
});
