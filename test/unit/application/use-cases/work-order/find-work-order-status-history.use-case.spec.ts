import { FindWorkOrderStatusHistoryUseCase } from '@application/use-cases/work-order/find-work-order-status-history.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IStatusHistoryRepository } from '@domain/interfaces/repositories/status-history.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { createMockWorkOrder, createMockWorkOrderRepository } from '../../../../helpers/work-order-mock.factory';
import { createMockStatusHistory, createMockStatusHistoryRepository } from '../../../../helpers/status-history-mock.factory';

describe('FindWorkOrderStatusHistoryUseCase', () => {
  let useCase: FindWorkOrderStatusHistoryUseCase;
  let workOrderRepository: jest.Mocked<IWorkOrderRepository>;
  let statusHistoryRepository: jest.Mocked<IStatusHistoryRepository>;

  beforeEach(() => {
    workOrderRepository = createMockWorkOrderRepository();
    statusHistoryRepository = createMockStatusHistoryRepository();
    useCase = new FindWorkOrderStatusHistoryUseCase(statusHistoryRepository, workOrderRepository);
  });

  it('should return status history when work order exists', async () => {
    const workOrder = createMockWorkOrder();
    const history = [createMockStatusHistory({ workOrderId: workOrder.id })];

    workOrderRepository.findById.mockResolvedValue(workOrder);
    statusHistoryRepository.findByWorkOrderId.mockResolvedValue(history);

    const result = await useCase.execute(workOrder.id);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(history[0]);
    expect(workOrderRepository.findById).toHaveBeenCalledWith(workOrder.id);
    expect(statusHistoryRepository.findByWorkOrderId).toHaveBeenCalledWith(workOrder.id);
  });

  it('should throw ResourceNotFoundException when work order not found (line 17)', async () => {
    workOrderRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
    expect(statusHistoryRepository.findByWorkOrderId).not.toHaveBeenCalled();
  });

  it('should return empty array when work order has no status history', async () => {
    const workOrder = createMockWorkOrder();
    workOrderRepository.findById.mockResolvedValue(workOrder);
    statusHistoryRepository.findByWorkOrderId.mockResolvedValue([]);

    const result = await useCase.execute(workOrder.id);

    expect(result).toHaveLength(0);
  });
});
