import { randomUUID } from 'node:crypto';
import { FindMyWorkOrdersQuotesUseCase } from '@application/use-cases/me/find-my-work-orders-quotes.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('FindMyWorkOrdersQuotesUseCase', () => {
  it('should return the quotes when the work order customer is authorized', async () => {
    const userId = randomUUID();
    const workOrder = { id: randomUUID(), customerId: randomUUID() };
    const workOrderRepository = { findById: jest.fn().mockResolvedValue(workOrder) };
    const quoteRepository = {
      findByWorkOrderId: jest.fn().mockResolvedValue([{ id: randomUUID() }]),
    };
    const policy = { assertCustomerAuthorized: jest.fn().mockResolvedValue(undefined) };

    const useCase = new FindMyWorkOrdersQuotesUseCase(
      workOrderRepository as never,
      quoteRepository as never,
      policy as never,
    );

    const result = await useCase.execute(userId, workOrder.id);

    expect(result).toHaveLength(1);
  });

  it('should throw 404 when the work order does not exist', async () => {
    const workOrderRepository = { findById: jest.fn().mockResolvedValue(null) };
    const quoteRepository = { findByWorkOrderId: jest.fn() };
    const policy = { assertCustomerAuthorized: jest.fn() };

    const useCase = new FindMyWorkOrdersQuotesUseCase(
      workOrderRepository as never,
      quoteRepository as never,
      policy as never,
    );

    await expect(useCase.execute(randomUUID(), randomUUID())).rejects.toThrow(
      ResourceNotFoundException,
    );
  });
});
