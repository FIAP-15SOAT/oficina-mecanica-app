import { randomUUID } from 'node:crypto';
import { FindMyWorkOrderByIdUseCase } from '@application/use-cases/me/find-my-work-order-by-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('FindMyWorkOrderByIdUseCase', () => {
  it('should return the work order when its customer is authorized', async () => {
    const userId = randomUUID();
    const workOrder = { id: randomUUID(), customerId: randomUUID() };
    const workOrderRepository = { findByIdWithDetails: jest.fn().mockResolvedValue(workOrder) };
    const policy = { assertCustomerAuthorized: jest.fn().mockResolvedValue(undefined) };

    const useCase = new FindMyWorkOrderByIdUseCase(workOrderRepository as never, policy as never);

    const result = await useCase.execute(userId, workOrder.id);

    expect(result).toBe(workOrder);
    expect(policy.assertCustomerAuthorized).toHaveBeenCalledWith(userId, workOrder.customerId);
  });

  it('should throw 404 when the work order does not exist', async () => {
    const workOrderRepository = { findByIdWithDetails: jest.fn().mockResolvedValue(null) };
    const policy = { assertCustomerAuthorized: jest.fn() };

    const useCase = new FindMyWorkOrderByIdUseCase(workOrderRepository as never, policy as never);

    await expect(useCase.execute(randomUUID(), randomUUID())).rejects.toThrow(
      ResourceNotFoundException,
    );
  });
});
