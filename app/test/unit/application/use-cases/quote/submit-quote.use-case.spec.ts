import { SubmitQuoteUseCase } from '@application/use-cases/quote/submit-quote.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { createMockQuote, createMockQuoteService } from '../../../../helpers/quote-mock.factory';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';
import { createMockCustomer } from '../../../../helpers/customer-mock.factory';
import { createMockUser } from '../../../../helpers/user-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import { Email } from '@domain/value-objects/email.vo';
import { SendEmailInput } from '@application/ports/output/email-sender.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { createMockLogger } from '../../../../helpers/logger-mock.factory';

const mockEmailSender = {
  send: jest.fn().mockResolvedValue(undefined),
};

describe('SubmitQuoteUseCase', () => {
  let useCase: SubmitQuoteUseCase;
  let logger: jest.Mocked<ILogger>;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    jest.clearAllMocks();
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUow = unitOfWork;
    (mockRepos.userCustomer.findUsersByCustomerId as jest.Mock).mockResolvedValue([]);
    logger = createMockLogger();
    useCase = new SubmitQuoteUseCase(mockUow, mockEmailSender, logger);
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

  it('should submit quote and change work order status to AWAITING_APPROVAL when REJECTED', async () => {
    const service = createMockQuoteService();
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [service] });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.REJECTED,
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

    expect(mockRepos.workOrder.update).toHaveBeenCalled();
    expect(mockRepos.statusHistory.create).toHaveBeenCalled();
    expect(result).toBe(savedQuote);
  });

  it('should reject submitting when work order is still RECEIVED (not diagnosed)', async () => {
    const service = createMockQuoteService();
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [service] });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.RECEIVED,
    });

    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);

    await expect(useCase.execute(quote.id)).rejects.toThrow(BusinessRuleViolationException);

    expect(mockRepos.quote.update).not.toHaveBeenCalled();
    expect(mockRepos.workOrder.update).not.toHaveBeenCalled();
    expect(mockRepos.statusHistory.create).not.toHaveBeenCalled();
    expect(mockEmailSender.send).not.toHaveBeenCalled();
  });

  it('should submit a competing quote without transitioning the work order when already AWAITING_APPROVAL', async () => {
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

    const result = await useCase.execute(quote.id);

    expect(mockRepos.quote.update).toHaveBeenCalled();
    expect(mockRepos.workOrder.update).not.toHaveBeenCalled();
    expect(mockRepos.statusHistory.create).not.toHaveBeenCalled();
    expect(mockEmailSender.send).toHaveBeenCalled();
    expect(result).toBe(savedQuote);
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote is not PENDING', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.IN_DIAGNOSIS,
    });

    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);

    await expect(useCase.execute(quote.id)).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw BusinessRuleViolationException when quote has no services or parts', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.IN_DIAGNOSIS,
    });

    // services and partsSupplies not set → treated as empty
    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);

    await expect(useCase.execute(quote.id)).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should send email to the customer when no active linked users exist', async () => {
    const service = createMockQuoteService();
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [service] });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.IN_DIAGNOSIS,
    });
    const customer = createMockCustomer({
      email: Email.create('test@example.com'),
      name: 'Cliente Teste',
    });
    const savedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.SENT });

    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(savedQuote);

    await useCase.execute(quote.id);

    expect(mockEmailSender.send).toHaveBeenCalledTimes(1);
    const emailContent = mockEmailSender.send.mock.calls[0][0] as SendEmailInput;
    expect(emailContent.toEmail).toBe('test@example.com');
    expect(emailContent.toName).toBe('Cliente Teste');
    expect(emailContent.message.text).not.toContain('http');
    expect(emailContent.message.html).not.toContain('http');
  });

  it('should notify all active linked users without duplicates, falling back to the commercial email when none are linked', async () => {
    const service = createMockQuoteService();
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [service] });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.IN_DIAGNOSIS,
    });
    const customer = createMockCustomer({ email: Email.create('commercial@example.com') });
    const savedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.SENT });

    const activeUserA = createMockUser({
      email: Email.create('userA@example.com'),
      name: 'User A',
      isActive: true,
    });
    const activeUserBDuplicate = createMockUser({
      email: Email.create('userA@example.com'),
      name: 'User A Duplicate',
      isActive: true,
    });
    const inactiveUser = createMockUser({
      email: Email.create('inactive@example.com'),
      name: 'Inactive User',
      isActive: false,
    });

    (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(savedQuote);
    (mockRepos.userCustomer.findUsersByCustomerId as jest.Mock).mockResolvedValue([
      activeUserA,
      activeUserBDuplicate,
      inactiveUser,
    ]);

    await useCase.execute(quote.id);

    expect(mockEmailSender.send).toHaveBeenCalledTimes(1);
    const emailContent = mockEmailSender.send.mock.calls[0][0] as SendEmailInput;
    expect(emailContent.toEmail).toBe('usera@example.com');
  });

  it('should fail if email sending fails', async () => {
    const service = createMockQuoteService();
    const quote = createMockQuote({ status: QuoteStatus.PENDING, services: [service] });
    const workOrder = createMockWorkOrder({
      id: quote.workOrderId,
      status: WorkOrderStatus.IN_DIAGNOSIS,
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
