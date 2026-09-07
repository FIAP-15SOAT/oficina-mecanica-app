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
import { SendEmailInput } from '@application/ports/output/email-sender.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { createMockLogger } from '../../../../helpers/logger-mock.factory';
import { IMetrics } from '@application/ports/output/metrics.service.interface';
import { createMockMetrics } from '../../../../helpers/metrics-mock.factory';
import {
  arrangeStatusHistory,
  createMockStatusHistory,
} from '../../../../helpers/status-history-mock.factory';

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
  let logger: jest.Mocked<ILogger>;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUow: jest.Mocked<IUnitOfWork>;
  let metrics: jest.Mocked<IMetrics>;

  beforeEach(() => {
    jest.clearAllMocks();
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUow = unitOfWork;
    metrics = createMockMetrics();
    logger = createMockLogger();
    useCase = new SubmitQuoteUseCase(
      mockUow,
      mockEmailSender,
      mockTokenService,
      'test-secret',
      'http://localhost:3000/api',
      logger,
      metrics,
      mockRepos.statusHistory,
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

  it('should send email when customer has email', async () => {
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

    await useCase.execute(quote.id);

    expect(mockEmailSender.send).toHaveBeenCalled();
    const emailContent = mockEmailSender.send.mock.calls[0][0] as SendEmailInput;
    expect(emailContent.message.text).toContain(`/decisions?token=`);
    expect(emailContent.message.html).toContain(`/decisions?token=`);
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
  describe('dwell metrics', () => {
    beforeEach(() => {
      // `clearAllMocks` limpa chamadas, mas nao implementacoes: um teste anterior
      // deixa o envio de e-mail rejeitando.
      mockEmailSender.send.mockResolvedValue(undefined);
    });

    function arrangeHistory(workOrderId: string) {
      arrangeStatusHistory(
        mockRepos.statusHistory,
        [
          createMockStatusHistory({
            workOrderId,
            previousStatus: WorkOrderStatus.RECEIVED,
            newStatus: WorkOrderStatus.IN_DIAGNOSIS,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          }),
        ],
        new Date('2026-01-01T03:00:00.000Z'),
      );
    }

    it('should record the dwell in IN_DIAGNOSIS when the work order transitions', async () => {
      const quote = createMockQuote({
        status: QuoteStatus.PENDING,
        services: [createMockQuoteService()],
      });
      const workOrder = createMockWorkOrder({
        id: quote.workOrderId,
        status: WorkOrderStatus.IN_DIAGNOSIS,
      });

      (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
      (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
      (mockRepos.customer.findById as jest.Mock).mockResolvedValue(
        createMockCustomer({ id: workOrder.customerId }),
      );
      (mockRepos.quote.update as jest.Mock).mockResolvedValue(quote);
      (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(workOrder);
      arrangeHistory(workOrder.id);

      await useCase.execute(quote.id);

      expect(metrics.record).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'work_order.status.duration' }),
        3 * 3600,
        { workOrderStatus: WorkOrderStatus.IN_DIAGNOSIS },
      );
    });

    /**
     * A transição só ocorre a partir de `IN_DIAGNOSIS` ou `REJECTED`. Com a OS
     * já em `AWAITING_APPROVAL` não há entrada nova no histórico — e o retorno
     * composto precisa dizer isso, senão a seção pós-commit inventaria uma
     * permanência.
     */
    it('should not record a metric when the work order was already in AWAITING_APPROVAL', async () => {
      const quote = createMockQuote({
        status: QuoteStatus.PENDING,
        services: [createMockQuoteService()],
      });
      const workOrder = createMockWorkOrder({
        id: quote.workOrderId,
        status: WorkOrderStatus.AWAITING_APPROVAL,
      });

      (mockRepos.quote.findByIdWithDetails as jest.Mock).mockResolvedValue(quote);
      (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
      (mockRepos.customer.findById as jest.Mock).mockResolvedValue(
        createMockCustomer({ id: workOrder.customerId }),
      );
      (mockRepos.quote.update as jest.Mock).mockResolvedValue(quote);

      await useCase.execute(quote.id);

      expect(metrics.record).not.toHaveBeenCalled();
      expect(mockRepos.statusHistory.findByWorkOrderId).not.toHaveBeenCalled();
    });
  });
});
