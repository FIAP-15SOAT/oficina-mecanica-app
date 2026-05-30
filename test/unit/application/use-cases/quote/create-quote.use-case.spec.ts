import { CreateQuoteUseCase } from '@application/use-cases/quote/create-quote.use-case';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import { createMockQuote } from '../../../../helpers/quote-mock.factory';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';
import { createMockService } from '../../../../helpers/service-mock.factory';
import { createMockPartSupply } from '../../../../helpers/part-supply-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';

describe('CreateQuoteUseCase', () => {
  let useCase: CreateQuoteUseCase;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUnitOfWork: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUnitOfWork = unitOfWork;
    useCase = new CreateQuoteUseCase(mockUnitOfWork);
  });

  it('should create an empty quote when WO is IN_DIAGNOSIS (no items)', async () => {
    const workOrder = createMockWorkOrder({ status: WorkOrderStatus.IN_DIAGNOSIS });
    const quote = createMockQuote({ workOrderId: workOrder.id });

    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quote.create as jest.Mock).mockResolvedValue(quote);

    const result = await useCase.execute({ workOrderId: workOrder.id });
    expect(result).toBe(quote);
    expect(mockRepos.quote.create).toHaveBeenCalledTimes(1);
    expect(mockRepos.quote.createWithItems).not.toHaveBeenCalled();
  });

  it('should create a quote with items when services are provided', async () => {
    const workOrder = createMockWorkOrder({ status: WorkOrderStatus.IN_DIAGNOSIS });
    const service = createMockService({ basePrice: 100 });
    const quote = createMockQuote({ workOrderId: workOrder.id });

    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.service.findByIds as jest.Mock).mockResolvedValue([service]);
    (mockRepos.quote.createWithItems as jest.Mock).mockResolvedValue(quote);

    const result = await useCase.execute({
      workOrderId: workOrder.id,
      services: [{ serviceId: service.id, quantity: 1 }],
    });

    expect(result).toBe(quote);
    expect(mockRepos.quote.createWithItems).toHaveBeenCalledTimes(1);
    expect(mockRepos.quote.create).not.toHaveBeenCalled();
  });

  it('should reject parts-only payload (no service) with BusinessRuleViolationException', async () => {
    const workOrder = createMockWorkOrder({ status: WorkOrderStatus.IN_DIAGNOSIS });
    const part = createMockPartSupply();

    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.partSupply.findByIds as jest.Mock).mockResolvedValue([part]);

    await expect(
      useCase.execute({
        workOrderId: workOrder.id,
        partsSupplies: [{ partSupplyId: part.id, quantity: 1 }],
      }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceNotFoundException for unknown service id', async () => {
    const workOrder = createMockWorkOrder({ status: WorkOrderStatus.IN_DIAGNOSIS });

    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.service.findByIds as jest.Mock).mockResolvedValue([]);

    await expect(
      useCase.execute({
        workOrderId: workOrder.id,
        services: [{ serviceId: 'non-existent-id', quantity: 1 }],
      }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw ResourceNotFoundException for unknown part id', async () => {
    const workOrder = createMockWorkOrder({ status: WorkOrderStatus.IN_DIAGNOSIS });
    const service = createMockService();

    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.service.findByIds as jest.Mock).mockResolvedValue([service]);
    (mockRepos.partSupply.findByIds as jest.Mock).mockResolvedValue([]);

    await expect(
      useCase.execute({
        workOrderId: workOrder.id,
        services: [{ serviceId: service.id, quantity: 1 }],
        partsSupplies: [{ partSupplyId: 'bad-part-id', quantity: 1 }],
      }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw ResourceNotFoundException when WO not found', async () => {
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute({ workOrderId: 'bad-id' })).rejects.toThrow(
      ResourceNotFoundException,
    );
  });

  it('should throw BusinessRuleViolationException when WO is RECEIVED', async () => {
    const workOrder = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);

    await expect(useCase.execute({ workOrderId: workOrder.id })).rejects.toThrow(
      BusinessRuleViolationException,
    );
  });

  it('should create a quote when WO is AWAITING_APPROVAL', async () => {
    const workOrder = createMockWorkOrder({ status: WorkOrderStatus.AWAITING_APPROVAL });
    const quote = createMockQuote({ workOrderId: workOrder.id });

    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(workOrder);
    (mockRepos.quote.create as jest.Mock).mockResolvedValue(quote);

    const result = await useCase.execute({ workOrderId: workOrder.id });
    expect(result).toBe(quote);
  });
});
