import { SubmitQuoteUseCase } from '@application/use-cases/quote/submit-quote.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { createMockQuote, createMockQuoteService } from '../../../../helpers/quote-mock.factory';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';
import { createMockCustomer } from '../../../../helpers/customer-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import { Email } from '@domain/value-objects/email.vo';

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
    const service = createMockQuoteService();
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [service] });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.IN_DIAGNOSIS,
    });
    const customer = createMockCustomer({ id: workOrder.customerId });
    const savedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.SENT });

    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(savedQuote);
    (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute(quote.id);

    expect(mockRepos.quote.update).toHaveBeenCalled();
    expect(mockRepos.workOrder.update).toHaveBeenCalled();
    expect(mockRepos.statusHistory.create).toHaveBeenCalled();
    expect(result).toBe(savedQuote);
  });

  it('should submit quote without changing WO status when already AWAITING_APPROVAL', async () => {
    const service = createMockQuoteService();
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [service] });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.AWAITING_APPROVAL,
    });
    const customer = createMockCustomer({ id: workOrder.customerId });
    const savedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.SENT });

    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(savedQuote);

    await useCase.execute(quote.id);

    expect(mockRepos.statusHistory.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);

    await expect(useCase.execute(quote.id)).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw BusinessRuleViolationException when quote has no services or parts', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    // services and partsSupplies not set → treated as empty
    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);

    await expect(useCase.execute(quote.id)).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should send email when customer has email', async () => {
    const service = createMockQuoteService();
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [service] });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.AWAITING_APPROVAL,
    });
    const customer = createMockCustomer({ email: Email.create('test@example.com') });
    const savedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.SENT });

    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(savedQuote);

    await useCase.execute(quote.id);

    expect(mockEmailSender.send).toHaveBeenCalled();
  });

  it('should fail if email sending fails', async () => {
    const service = createMockQuoteService();
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [service] });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.AWAITING_APPROVAL,
    });
    const customer = createMockCustomer({ email: Email.create('test@example.com') });
    const savedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.SENT });

    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(savedQuote);
    mockEmailSender.send.mockRejectedValue(new Error('SMTP error'));

    await expect(useCase.execute(quote.id)).rejects.toThrow('SMTP error');
  });
});
