import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('UserCustomerAccess Entity', () => {
  const validProps = {
    userId: 'user-uuid-1',
    customerId: 'customer-uuid-1',
    relationship: AccessRelationship.SELF,
  };

  it('should create a valid SELF access link', () => {
    const access = UserCustomerAccess.create(validProps);

    expect(access.id).toBeDefined();
    expect(access.userId).toBe('user-uuid-1');
    expect(access.customerId).toBe('customer-uuid-1');
    expect(access.relationship).toBe(AccessRelationship.SELF);
    expect(access.createdAt).toBeInstanceOf(Date);
  });

  it('should create a valid REPRESENTATIVE access link', () => {
    const access = UserCustomerAccess.create({
      ...validProps,
      relationship: AccessRelationship.REPRESENTATIVE,
    });

    expect(access.relationship).toBe(AccessRelationship.REPRESENTATIVE);
  });

  it('should throw for an invalid relationship value', () => {
    expect(() =>
      UserCustomerAccess.create({ ...validProps, relationship: 'OWNER' as AccessRelationship }),
    ).toThrow(DomainValidationException);
  });

  it('should reconstitute from persisted props', () => {
    const now = new Date();
    const access = UserCustomerAccess.reconstitute({
      id: 'access-uuid-1',
      userId: 'user-uuid-1',
      customerId: 'customer-uuid-1',
      relationship: AccessRelationship.SELF,
      createdAt: now,
    });

    expect(access.id).toBe('access-uuid-1');
    expect(access.createdAt).toBe(now);
  });
});
