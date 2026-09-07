import { randomUUID } from 'node:crypto';
import { FindAllMyWorkOrdersUseCase } from '@application/use-cases/me/find-all-my-work-orders.use-case';

describe('FindAllMyWorkOrdersUseCase', () => {
  it('should filter the query by the authorized customer ids', async () => {
    const userId = randomUUID();
    const customerId = randomUUID();
    const policy = { getAuthorizedCustomerIds: jest.fn().mockResolvedValue([customerId]) };
    const workOrderRepository = {
      findAllPaginated: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    const useCase = new FindAllMyWorkOrdersUseCase(policy as never, workOrderRepository as never);

    await useCase.execute(userId, { page: 1, limit: 10 });

    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { customerIdIn: [customerId] },
    );
  });

  it('should intersect an explicit customerId filter with the authorized set', async () => {
    const userId = randomUUID();
    const authorizedId = randomUUID();
    const otherCustomerId = randomUUID();
    const policy = { getAuthorizedCustomerIds: jest.fn().mockResolvedValue([authorizedId]) };
    const workOrderRepository = {
      findAllPaginated: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    const useCase = new FindAllMyWorkOrdersUseCase(policy as never, workOrderRepository as never);

    const result = await useCase.execute(userId, { page: 1, limit: 10 }, otherCustomerId);

    expect(result).toEqual({ items: [], total: 0 });
    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { customerIdIn: [] },
    );
  });
});
