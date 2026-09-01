import { randomUUID } from 'node:crypto';
import { CustomerAccessPolicy } from '@application/policies/customer-access.policy';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('CustomerAccessPolicy', () => {
  it('should return the authorized customer ids', async () => {
    const userId = randomUUID();
    const customerId = randomUUID();
    const userCustomerRepository = {
      findActiveCustomerIdsByUserId: jest.fn().mockResolvedValue([customerId]),
    };

    const policy = new CustomerAccessPolicy(userCustomerRepository as never);

    const result = await policy.getAuthorizedCustomerIds(userId);

    expect(result).toEqual([customerId]);
  });

  it('should not throw when the customer is authorized', async () => {
    const userId = randomUUID();
    const customerId = randomUUID();
    const userCustomerRepository = {
      findActiveCustomerIdsByUserId: jest.fn().mockResolvedValue([customerId]),
    };

    const policy = new CustomerAccessPolicy(userCustomerRepository as never);

    await expect(policy.assertCustomerAuthorized(userId, customerId)).resolves.toBeUndefined();
  });

  it('should throw ResourceNotFoundException (never Forbidden) when unauthorized', async () => {
    const userCustomerRepository = {
      findActiveCustomerIdsByUserId: jest.fn().mockResolvedValue([randomUUID()]),
    };

    const policy = new CustomerAccessPolicy(userCustomerRepository as never);

    await expect(policy.assertCustomerAuthorized(randomUUID(), randomUUID())).rejects.toThrow(
      ResourceNotFoundException,
    );
  });
});
