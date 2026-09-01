import { randomUUID } from 'node:crypto';
import { UserCustomer } from '@domain/entities/user-customer.entity';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('UserCustomer Entity', () => {
  it('should create a link between a user and a customer', () => {
    const userId = randomUUID();
    const customerId = randomUUID();

    const link = UserCustomer.create({ userId, customerId });

    expect(link.userId).toBe(userId);
    expect(link.customerId).toBe(customerId);
    expect(link.createdAt).toBeInstanceOf(Date);
  });

  it('should throw when userId is missing', () => {
    expect(() => UserCustomer.create({ userId: '', customerId: randomUUID() })).toThrow(
      DomainValidationException,
    );
  });

  it('should throw when customerId is missing', () => {
    expect(() => UserCustomer.create({ userId: randomUUID(), customerId: '' })).toThrow(
      DomainValidationException,
    );
  });
});
