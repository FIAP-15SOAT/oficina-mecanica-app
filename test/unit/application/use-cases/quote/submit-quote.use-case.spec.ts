import { SubmitQuoteUseCase } from '@application/use-cases/quote/submit-quote.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { createMockQuote, createMockQuoteService } from '../../../../helpers/quote-mock.factory';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';
import { createMockCustomer } from '../../../../helpers/customer-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';

const mockTokenService = {
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
  signTokenPair: jest.fn(),
  signWithSecret: jest.fn().mockReturnValue('mock-token'),
  verifyWithSecret: jest.fn(),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
};

const mockEmailSender = {
  send: jest.fn().mockResolvedValue(undefined),
};

describe('SubmitQuoteUseCase', () => {
  let useCase: SubmitQuoteUseCase;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    jest.clearAllMocks();
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUow = unitOfWork;
    useCase = new SubmitQuoteUseCase(
      mockUow,
      mockEmailSender,
      mockTokenService,
      'test-secret',
      'http://localhost:3000/api',
    );
  });

  it('should submit quote and change WO to AWAITING_APPROVAL when IN_DIAGNOSIS', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.IN_DIAGNOSIS,
    });
    const customer = createMockCustomer({ id: workOrder.customerId });
    const service = createMockQuoteService({ quoteId: quote.id });
    const savedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.SENT });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.quoteService.findByQuoteId as jest.Mock).mockResolvedValue([service]);
    (mockRepos.quotePartSupply.findByQuoteId as jest.Mock).mockResolvedValue([]);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(savedQuote);
    (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);

    const result = await useCase.execute(quote.id);

    expect(mockRepos.quote.update).toHaveBeenCalled();
    expect(mockRepos.workOrder.update).toHaveBeenCalled();
    expect(mockRepos.statusHistory.create).toHaveBeenCalled();
    expect(result).toBe(savedQuote);
  });

  it('should submit quote without changing WO status when already AWAITING_APPROVAL', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.AWAITING_APPROVAL,
    });
    const customer = createMockCustomer({ id: workOrder.customerId });
    const service = createMockQuoteService({ quoteId: quote.id });
    const savedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.SENT });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.quoteService.findByQuoteId as jest.Mock).mockResolvedValue([service]);
    (mockRepos.quotePartSupply.findByQuoteId as jest.Mock).mockResolvedValue([]);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(savedQuote);
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);

    await useCase.execute(quote.id);

    expect(mockRepos.statusHistory.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);

    await expect(useCase.execute(quote.id)).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceConflictException when quote has no services or parts', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.quoteService.findByQuoteId as jest.Mock).mockResolvedValue([]);
    (mockRepos.quotePartSupply.findByQuoteId as jest.Mock).mockResolvedValue([]);

    await expect(useCase.execute(quote.id)).rejects.toThrow(ResourceConflictException);
  });

  it('should send email when customer has email', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.AWAITING_APPROVAL,
    });
    const customer = createMockCustomer({ email: 'test@example.com' });
    const savedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.SENT });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.quoteService.findByQuoteId as jest.Mock).mockResolvedValue([
      createMockQuoteService(),
    ]);
    (mockRepos.quotePartSupply.findByQuoteId as jest.Mock).mockResolvedValue([]);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(savedQuote);
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);

    await useCase.execute(quote.id);

    expect(mockEmailSender.send).toHaveBeenCalled();
  });

  it('should fail if email sending fails', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.AWAITING_APPROVAL,
    });
    const customer = createMockCustomer({ email: 'test@example.com' });
    const savedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.SENT });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.quoteService.findByQuoteId as jest.Mock).mockResolvedValue([
      createMockQuoteService(),
    ]);
    (mockRepos.quotePartSupply.findByQuoteId as jest.Mock).mockResolvedValue([]);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(savedQuote);
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    mockEmailSender.send.mockRejectedValue(new Error('SMTP error'));

    await expect(useCase.execute(quote.id)).rejects.toThrow('SMTP error');
  });
});
