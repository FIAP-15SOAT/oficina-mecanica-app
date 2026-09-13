import { randomUUID } from 'node:crypto';
import { FindMyQuoteByIdUseCase } from '@application/use-cases/me/find-my-quote-by-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('FindMyQuoteByIdUseCase', () => {
  it('should return the quote when its work order customer is authorized', async () => {
    const userId = randomUUID();
    const workOrderId = randomUUID();
    const customerId = randomUUID();
    const quote = { id: randomUUID(), workOrderId };
    const quoteRepository = { findByIdWithDetails: jest.fn().mockResolvedValue(quote) };
    const workOrderRepository = {
      findById: jest.fn().mockResolvedValue({ id: workOrderId, customerId }),
    };
    const policy = { assertCustomerAuthorized: jest.fn().mockResolvedValue(undefined) };

    const useCase = new FindMyQuoteByIdUseCase(
      quoteRepository as never,
      workOrderRepository as never,
      policy as never,
    );

    const result = await useCase.execute(userId, quote.id);

    expect(result).toBe(quote);
    expect(policy.assertCustomerAuthorized).toHaveBeenCalledWith(userId, customerId);
  });

  it('should throw 404 when the quote does not exist', async () => {
    const quoteRepository = { findByIdWithDetails: jest.fn().mockResolvedValue(null) };
    const workOrderRepository = { findById: jest.fn() };
    const policy = { assertCustomerAuthorized: jest.fn() };

    const useCase = new FindMyQuoteByIdUseCase(
      quoteRepository as never,
      workOrderRepository as never,
      policy as never,
    );

    await expect(useCase.execute(randomUUID(), randomUUID())).rejects.toThrow(
      ResourceNotFoundException,
    );
  });

  it('should throw 404 when the quote work order is gone', async () => {
    const quote = { id: randomUUID(), workOrderId: randomUUID() };
    const quoteRepository = { findByIdWithDetails: jest.fn().mockResolvedValue(quote) };
    const workOrderRepository = { findById: jest.fn().mockResolvedValue(null) };
    const policy = { assertCustomerAuthorized: jest.fn() };

    const useCase = new FindMyQuoteByIdUseCase(
      quoteRepository as never,
      workOrderRepository as never,
      policy as never,
    );

    await expect(useCase.execute(randomUUID(), quote.id)).rejects.toThrow(
      ResourceNotFoundException,
    );
    expect(policy.assertCustomerAuthorized).not.toHaveBeenCalled();
  });
});
