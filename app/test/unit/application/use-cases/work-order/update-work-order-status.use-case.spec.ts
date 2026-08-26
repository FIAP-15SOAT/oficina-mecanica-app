import { UpdateWorkOrderStatusUseCase } from '@application/use-cases/work-order/update-work-order-status.use-case';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { createMockLogger } from '../../../../helpers/logger-mock.factory';

describe('UpdateWorkOrderStatusUseCase', () => {
  let useCase: UpdateWorkOrderStatusUseCase;
  let logger: jest.Mocked<ILogger>;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUow = unitOfWork;
    logger = createMockLogger();
    useCase = new UpdateWorkOrderStatusUseCase(mockUow, logger);
  });

  it('should transition RECEIVED -> IN_DIAGNOSIS', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    const updated = createMockWorkOrder({ ...wo, status: WorkOrderStatus.IN_DIAGNOSIS });

    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(wo);
    (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(updated);
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute(wo.id, {
      status: WorkOrderStatus.IN_DIAGNOSIS,
      userId: '550e8400-e29b-41d4-a716-446655440099',
    });
    expect(result.status).toBe(WorkOrderStatus.IN_DIAGNOSIS);
  });

  it('should transition RECEIVED -> CANCELLED with notes', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    const updated = createMockWorkOrder({ ...wo, status: WorkOrderStatus.CANCELLED });

    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(wo);
    (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(updated);
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute(wo.id, {
      status: WorkOrderStatus.CANCELLED,
      notes: 'Cancelado a pedido do cliente',
      userId: '550e8400-e29b-41d4-a716-446655440099',
    });
    expect(result.status).toBe(WorkOrderStatus.CANCELLED);
  });

  it('should transition COMPLETED -> DELIVERED', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.COMPLETED });
    const updated = createMockWorkOrder({ ...wo, status: WorkOrderStatus.DELIVERED });

    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(wo);
    (mockRepos.workOrder.update as jest.Mock).mockResolvedValue(updated);
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute(wo.id, {
      status: WorkOrderStatus.DELIVERED,
      userId: '550e8400-e29b-41d4-a716-446655440099',
    });
    expect(result.status).toBe(WorkOrderStatus.DELIVERED);
  });

  it('should throw ResourceNotFoundException when work order not found', async () => {
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('bad-id', {
        status: WorkOrderStatus.IN_DIAGNOSIS,
        userId: '550e8400-e29b-41d4-a716-446655440099',
      }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException for disallowed status via PATCH', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(wo);

    // APPROVED is not in PATCH_STATUS_ALLOWED
    await expect(
      useCase.execute(wo.id, {
        status: WorkOrderStatus.APPROVED,
        userId: '550e8400-e29b-41d4-a716-446655440099',
      }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw BusinessRuleViolationException when CANCELLED without notes', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    (mockRepos.workOrder.findById as jest.Mock).mockResolvedValue(wo);

    await expect(
      useCase.execute(wo.id, {
        status: WorkOrderStatus.CANCELLED,
        userId: '550e8400-e29b-41d4-a716-446655440099',
      }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });
});
