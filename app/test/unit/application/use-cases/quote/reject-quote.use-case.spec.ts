import { RejectQuoteUseCase } from '@application/use-cases/quote/reject-quote.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { createMockQuote } from '../../../../helpers/quote-mock.factory';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { createMockLogger } from '../../../../helpers/logger-mock.factory';

describe('RejectQuoteUseCase', () => {
  let useCase: RejectQuoteUseCase;
  let logger: jest.Mocked<ILogger>;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUow = unitOfWork;
    logger = createMockLogger();
    useCase = new RejectQuoteUseCase(mockUow, logger);
  });

  it('should reject quote and update work order status to REJECTED', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.AWAITING_APPROVAL,
    });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quote.findByWorkOrderId as jest.Mock).mockResolvedValue([quote]);
    (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(quote);
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute(
      quote.id,
      'Preço alto',
      '550e8400-e29b-41d4-a716-446655440099',
    );

    expect(mockRepos.quote.update).toHaveBeenCalled();
    expect(mockRepos.workOrder.update).toHaveBeenCalled();
    expect(mockRepos.statusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: 'Preço alto',
        changedById: '550e8400-e29b-41d4-a716-446655440099',
      }),
    );
    expect(result.status).toBe(QuoteStatus.REJECTED);
    expect(logger.event).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ customerId: workOrder.customerId }),
    );
  });

  it('should use default notes and null userId when not provided', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.AWAITING_APPROVAL,
    });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quote.findByWorkOrderId as jest.Mock).mockResolvedValue([quote]);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(workOrder);

    await useCase.execute(quote.id);

    expect(mockRepos.statusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: `Orçamento ${quote.id} rejeitado`,
        changedById: null,
      }),
    );
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not SENT', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);

    await expect(useCase.execute(quote.id)).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should keep the work order in AWAITING_APPROVAL when another quote is still SENT', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    const otherSentQuote = createMockQuote({ status: QuoteStatus.SENT });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.AWAITING_APPROVAL,
    });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quote.findByWorkOrderId as jest.Mock).mockResolvedValue([quote, otherSentQuote]);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(quote);

    const result = await useCase.execute(quote.id);

    expect(mockRepos.quote.update).toHaveBeenCalled();
    expect(mockRepos.workOrder.update).not.toHaveBeenCalled();
    expect(mockRepos.statusHistory.create).not.toHaveBeenCalled();
    expect(result.status).toBe(QuoteStatus.REJECTED);
    expect(logger.event).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ customerId: workOrder.customerId }),
    );
  });
});
