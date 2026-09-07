import { randomUUID } from 'node:crypto';
import { RevokeCustomerAccessUseCase } from '@application/use-cases/customer-access/revoke-customer-access.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('RevokeCustomerAccessUseCase', () => {
  it('should delete the link and log the event', async () => {
    const customerId = randomUUID();
    const userId = randomUUID();
    const userCustomerRepository = { exists: jest.fn().mockResolvedValue(true), delete: jest.fn() };
    const logger = { event: jest.fn() };

    const useCase = new RevokeCustomerAccessUseCase(
      userCustomerRepository as never,
      logger as never,
    );

    await useCase.execute(customerId, userId, randomUUID());

    expect(userCustomerRepository.delete).toHaveBeenCalledWith(userId, customerId);
    expect(logger.event).toHaveBeenCalled();
  });

  it('should throw when the link does not exist', async () => {
    const userCustomerRepository = {
      exists: jest.fn().mockResolvedValue(false),
      delete: jest.fn(),
    };
    const logger = { event: jest.fn() };

    const useCase = new RevokeCustomerAccessUseCase(
      userCustomerRepository as never,
      logger as never,
    );

    await expect(useCase.execute(randomUUID(), randomUUID(), randomUUID())).rejects.toThrow(
      ResourceNotFoundException,
    );
    expect(userCustomerRepository.delete).not.toHaveBeenCalled();
  });
});
