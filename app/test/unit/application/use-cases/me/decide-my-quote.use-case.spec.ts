import { randomUUID } from 'node:crypto';
import { DecideMyQuoteUseCase } from '@application/use-cases/me/decide-my-quote.use-case';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('DecideMyQuoteUseCase', () => {
  it('should approve via the shared UpdateQuoteStatusUseCase and return the quote reloaded with items', async () => {
    const userId = randomUUID();
    const workOrderId = randomUUID();
    const customerId = randomUUID();
    const quote = { id: randomUUID(), workOrderId };
    const detailedQuote = { ...quote, services: [{ serviceId: randomUUID() }] };
    const quoteRepository = {
      findById: jest.fn().mockResolvedValue(quote),
      findByIdWithDetails: jest.fn().mockResolvedValue(detailedQuote),
    };
    const workOrderRepository = {
      findById: jest.fn().mockResolvedValue({ id: workOrderId, customerId }),
    };
    const policy = { assertCustomerAuthorized: jest.fn().mockResolvedValue(undefined) };
    const updateQuoteStatusUseCase = { execute: jest.fn().mockResolvedValue(quote) };

    const useCase = new DecideMyQuoteUseCase(
      quoteRepository as never,
      workOrderRepository as never,
      policy as never,
      updateQuoteStatusUseCase,
    );

    const result = await useCase.execute(userId, quote.id, {
      action: QuoteDecisionAction.APPROVE,
      reason: null,
    });

    expect(result).toBe(detailedQuote);
    expect(quoteRepository.findByIdWithDetails).toHaveBeenCalledWith(quote.id);
    expect(updateQuoteStatusUseCase.execute).toHaveBeenCalledWith(quote.id, userId, {
      status: QuoteStatus.APPROVED,
      reason: null,
    });
  });

  it('should reject via the shared UpdateQuoteStatusUseCase with the given reason', async () => {
    const userId = randomUUID();
    const workOrderId = randomUUID();
    const customerId = randomUUID();
    const quote = { id: randomUUID(), workOrderId };
    const detailedQuote = { ...quote, services: [] };
    const quoteRepository = {
      findById: jest.fn().mockResolvedValue(quote),
      findByIdWithDetails: jest.fn().mockResolvedValue(detailedQuote),
    };
    const workOrderRepository = {
      findById: jest.fn().mockResolvedValue({ id: workOrderId, customerId }),
    };
    const policy = { assertCustomerAuthorized: jest.fn().mockResolvedValue(undefined) };
    const updateQuoteStatusUseCase = { execute: jest.fn().mockResolvedValue(quote) };

    const useCase = new DecideMyQuoteUseCase(
      quoteRepository as never,
      workOrderRepository as never,
      policy as never,
      updateQuoteStatusUseCase,
    );

    await useCase.execute(userId, quote.id, {
      action: QuoteDecisionAction.REJECT,
      reason: 'Preço muito alto',
    });

    expect(updateQuoteStatusUseCase.execute).toHaveBeenCalledWith(quote.id, userId, {
      status: QuoteStatus.REJECTED,
      reason: 'Preço muito alto',
    });
  });

  it('should fall back to the transaction result if the reload somehow finds nothing', async () => {
    const userId = randomUUID();
    const workOrderId = randomUUID();
    const customerId = randomUUID();
    const quote = { id: randomUUID(), workOrderId };
    const quoteRepository = {
      findById: jest.fn().mockResolvedValue(quote),
      findByIdWithDetails: jest.fn().mockResolvedValue(null),
    };
    const workOrderRepository = {
      findById: jest.fn().mockResolvedValue({ id: workOrderId, customerId }),
    };
    const policy = { assertCustomerAuthorized: jest.fn().mockResolvedValue(undefined) };
    const updateQuoteStatusUseCase = { execute: jest.fn().mockResolvedValue(quote) };

    const useCase = new DecideMyQuoteUseCase(
      quoteRepository as never,
      workOrderRepository as never,
      policy as never,
      updateQuoteStatusUseCase,
    );

    const result = await useCase.execute(userId, quote.id, {
      action: QuoteDecisionAction.APPROVE,
      reason: null,
    });

    expect(result).toBe(quote);
  });

  it('should throw 404 when the quote does not belong to an authorized customer', async () => {
    const quoteRepository = { findById: jest.fn().mockResolvedValue(null) };
    const workOrderRepository = { findById: jest.fn() };
    const policy = { assertCustomerAuthorized: jest.fn() };
    const updateQuoteStatusUseCase = { execute: jest.fn() };

    const useCase = new DecideMyQuoteUseCase(
      quoteRepository as never,
      workOrderRepository as never,
      policy as never,
      updateQuoteStatusUseCase,
    );

    await expect(
      useCase.execute(randomUUID(), randomUUID(), {
        action: QuoteDecisionAction.APPROVE,
        reason: null,
      }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw 404 when the quote work order is gone', async () => {
    const quote = { id: randomUUID(), workOrderId: randomUUID() };
    const quoteRepository = { findById: jest.fn().mockResolvedValue(quote) };
    const workOrderRepository = { findById: jest.fn().mockResolvedValue(null) };
    const policy = { assertCustomerAuthorized: jest.fn() };
    const updateQuoteStatusUseCase = { execute: jest.fn() };

    const useCase = new DecideMyQuoteUseCase(
      quoteRepository as never,
      workOrderRepository as never,
      policy as never,
      updateQuoteStatusUseCase,
    );

    await expect(
      useCase.execute(randomUUID(), quote.id, {
        action: QuoteDecisionAction.APPROVE,
        reason: null,
      }),
    ).rejects.toThrow(ResourceNotFoundException);
    expect(policy.assertCustomerAuthorized).not.toHaveBeenCalled();
  });
});
