import { randomUUID } from 'node:crypto';
import { CustomerAccessPolicy } from '@application/policies/customer-access.policy';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';

describe('CustomerAccessPolicy', () => {
  it('should return the authorized customer ids', async () => {
    const userId = randomUUID();
    const customerId = randomUUID();
    const userCustomerRepository = {
      findActiveCustomerIdsByUserId: jest.fn().mockResolvedValue([customerId]),
    };
    const logger = { event: jest.fn() };

    const policy = new CustomerAccessPolicy(userCustomerRepository as never, logger as never);

    const result = await policy.getAuthorizedCustomerIds(userId);

    expect(result).toEqual([customerId]);
  });

  it('should not throw when the customer is authorized', async () => {
    const userId = randomUUID();
    const customerId = randomUUID();
    const userCustomerRepository = {
      existsActiveLink: jest.fn().mockResolvedValue(true),
    };
    const logger = { event: jest.fn() };

    const policy = new CustomerAccessPolicy(userCustomerRepository as never, logger as never);

    await expect(policy.assertCustomerAuthorized(userId, customerId)).resolves.toBeUndefined();
    expect(userCustomerRepository.existsActiveLink).toHaveBeenCalledWith(userId, customerId);
    expect(logger.event).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException (never Forbidden) and log a business event when unauthorized', async () => {
    const userId = randomUUID();
    const customerId = randomUUID();
    const userCustomerRepository = {
      existsActiveLink: jest.fn().mockResolvedValue(false),
    };
    const logger = { event: jest.fn() };

    const policy = new CustomerAccessPolicy(userCustomerRepository as never, logger as never);

    await expect(policy.assertCustomerAuthorized(userId, customerId)).rejects.toThrow(
      ResourceNotFoundException,
    );
    expect(logger.event).toHaveBeenCalledWith(BUSINESS_EVENTS.CUSTOMER_ACCESS_DENIED, {
      subjectId: userId,
      customerId,
      externalAccessFailureReason: 'no_active_link',
    });
  });
});
