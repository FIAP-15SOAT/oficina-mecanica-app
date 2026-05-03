import { randomUUID } from 'node:crypto';
import { ApproveQuoteUseCase } from '@application/use-cases/quote/approve-quote.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { createMockQuote, createMockQuotePartSupply, createMockQuoteService } from '../../../../helpers/quote-mock.factory';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';
import { createMockPartSupply } from '../../../../helpers/part-supply-mock.factory';

import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';

describe('ApproveQuoteUseCase', () => {
  let useCase: ApproveQuoteUseCase;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUow = unitOfWork;
    useCase = new ApproveQuoteUseCase(mockUow);
  });

  it('should approve quote, create WO services, WO parts, stock reservations and update work order', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT, totalAmount: 500 });
    const workOrder = createMockWorkOrder({ id: quote.workOrderId, status: WorkOrderStatus.AWAITING_APPROVAL });
    const partSupplyId = randomUUID();
    const partSupply = createMockPartSupply({ id: partSupplyId, stock: 10, reservedStock: 2 });
    const qPart = createMockQuotePartSupply({ quoteId: quote.id, partSupplyId: partSupply.id, quantity: 2 });
    const qService = createMockQuoteService({ quoteId: quote.id });
    const updatedQuote = createMockQuote({ id: quote.id, status: QuoteStatus.APPROVED });

    (mockRepos.quote.findById as jest.Mock)
      .mockResolvedValueOnce(quote)
      .mockResolvedValueOnce(updatedQuote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quotePartSupply.findByQuoteId as jest.Mock).mockResolvedValue([qPart]);
    (mockRepos.quoteService.findByQuoteId as jest.Mock).mockResolvedValue([qService]);
    (mockRepos.partSupply.findByIds as jest.Mock).mockResolvedValue([partSupply]);
    (mockRepos.stockReservation.createMany as jest.Mock).mockResolvedValue(undefined);
    (mockRepos.partSupply.incrementReservedStock as jest.Mock).mockResolvedValue(undefined);
    (mockRepos.workOrderService.createMany as jest.Mock).mockResolvedValue(undefined);
    (mockRepos.workOrderPartSupply.createMany as jest.Mock).mockResolvedValue(undefined);
    (mockRepos.quote.update as jest.Mock).mockResolvedValue(quote);
    (mockRepos.quote.rejectPendingByWorkOrderId as jest.Mock).mockResolvedValue(undefined);
    (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute(quote.id, '550e8400-e29b-41d4-a716-446655440099');

    expect(mockRepos.quote.update).toHaveBeenCalled();
    expect(mockRepos.workOrder.update).toHaveBeenCalled();
    expect(mockRepos.statusHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      changedById: '550e8400-e29b-41d4-a716-446655440099',
    }));
    expect(mockRepos.stockReservation.createMany).toHaveBeenCalledTimes(1);
    expect(mockRepos.workOrderService.createMany).toHaveBeenCalledTimes(1);
    expect(mockRepos.workOrderPartSupply.createMany).toHaveBeenCalledTimes(1);
    expect(result).toBe(updatedQuote);
  });

  it('should handle null userId when not provided', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    const workOrder = createMockWorkOrder({ id: quote.workOrderId, status: WorkOrderStatus.AWAITING_APPROVAL });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quotePartSupply.findByQuoteId as jest.Mock).mockResolvedValue([]);
    (mockRepos.quoteService.findByQuoteId as jest.Mock).mockResolvedValue([]);

    await useCase.execute(quote.id);

    expect(mockRepos.statusHistory.create).toHaveBeenCalledWith(expect.objectContaining({
      changedById: null,
    }));
  });

  it('should throw ResourceNotFoundException when quote not found', async () => {
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when quote cannot be approved (not SENT)', async () => {
    const quote = createMockQuote({ status: QuoteStatus.PENDING });
    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);

    await expect(useCase.execute(quote.id)).rejects.toThrow(BusinessRuleViolationException);
  });


  it('should throw BusinessRuleViolationException when insufficient stock', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    const workOrder = createMockWorkOrder({ id: quote.workOrderId, status: WorkOrderStatus.AWAITING_APPROVAL });
    const partSupply = createMockPartSupply({ stock: 1, reservedStock: 1 }); // 0 available
    const qPart = createMockQuotePartSupply({ quoteId: quote.id, partSupplyId: partSupply.id, quantity: 2 });

    (mockRepos.quote.findById as jest.Mock).mockResolvedValue(quote);
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quotePartSupply.findByQuoteId as jest.Mock).mockResolvedValue([qPart]);
    (mockRepos.quoteService.findByQuoteId as jest.Mock).mockResolvedValue([]);
    (mockRepos.partSupply.findByIds as jest.Mock).mockResolvedValue([partSupply]);

    await expect(useCase.execute(quote.id)).rejects.toThrow(BusinessRuleViolationException);
  });

});
