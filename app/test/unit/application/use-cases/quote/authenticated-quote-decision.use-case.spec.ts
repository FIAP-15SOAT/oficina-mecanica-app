import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';
import { createMockQuote, createMockQuoteRepository } from '../../../../helpers/quote-mock.factory';
import {
  createMockWorkOrder,
  createMockWorkOrderRepository,
} from '../../../../helpers/work-order-mock.factory';
import { AuthenticatedQuoteDecisionUseCase } from '@application/use-cases/quote/authenticated-quote-decision.use-case';

describe('AuthenticatedQuoteDecisionUseCase', () => {
  let useCase: AuthenticatedQuoteDecisionUseCase;
  let quoteRepository: ReturnType<typeof createMockQuoteRepository>;
  let workOrderRepository: ReturnType<typeof createMockWorkOrderRepository>;
  let approveQuoteUseCase: { execute: jest.Mock };
  let rejectQuoteUseCase: { execute: jest.Mock };

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    workOrderRepository = createMockWorkOrderRepository();
    approveQuoteUseCase = { execute: jest.fn() };
    rejectQuoteUseCase = { execute: jest.fn() };
    useCase = new AuthenticatedQuoteDecisionUseCase(
      quoteRepository,
      workOrderRepository,
      approveQuoteUseCase as never,
      rejectQuoteUseCase as never,
    );
  });

  it('should approve when the quote belongs to the customer', async () => {
    const workOrder = createMockWorkOrder({ customerId: 'customer-1' });
    const quote = createMockQuote({ workOrderId: workOrder.id });
    quoteRepository.findById.mockResolvedValue(quote);
    workOrderRepository.findById.mockResolvedValue(workOrder);
    approveQuoteUseCase.execute.mockResolvedValue(quote);

    await useCase.execute({
      quoteId: quote.id,
      customerId: 'customer-1',
      action: QuoteDecisionAction.APPROVE,
    });

    expect(approveQuoteUseCase.execute).toHaveBeenCalledWith(quote.id);
    expect(rejectQuoteUseCase.execute).not.toHaveBeenCalled();
  });

  it('should reject with a reason when the quote belongs to the customer', async () => {
    const workOrder = createMockWorkOrder({ customerId: 'customer-1' });
    const quote = createMockQuote({ workOrderId: workOrder.id });
    quoteRepository.findById.mockResolvedValue(quote);
    workOrderRepository.findById.mockResolvedValue(workOrder);
    rejectQuoteUseCase.execute.mockResolvedValue(quote);

    await useCase.execute({
      quoteId: quote.id,
      customerId: 'customer-1',
      action: QuoteDecisionAction.REJECT,
      reason: 'Muito caro',
    });

    expect(rejectQuoteUseCase.execute).toHaveBeenCalledWith(quote.id, 'Muito caro');
  });

  it('should throw ResourceNotFoundException if quote does not exist', async () => {
    quoteRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        quoteId: 'inexistente',
        customerId: 'customer-1',
        action: QuoteDecisionAction.APPROVE,
      }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw UnauthorizedAccessException if the quote belongs to a different customer', async () => {
    const workOrder = createMockWorkOrder({ customerId: 'other-customer' });
    const quote = createMockQuote({ workOrderId: workOrder.id });
    quoteRepository.findById.mockResolvedValue(quote);
    workOrderRepository.findById.mockResolvedValue(workOrder);

    await expect(
      useCase.execute({
        quoteId: quote.id,
        customerId: 'customer-1',
        action: QuoteDecisionAction.APPROVE,
      }),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(approveQuoteUseCase.execute).not.toHaveBeenCalled();
    expect(rejectQuoteUseCase.execute).not.toHaveBeenCalled();
  });
});
