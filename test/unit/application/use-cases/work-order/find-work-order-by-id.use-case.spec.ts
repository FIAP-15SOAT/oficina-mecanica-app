import { FindWorkOrderByIdUseCase } from '@application/use-cases/work-order/find-work-order-by-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { createMockWorkOrder, createMockWorkOrderRepository } from '../../../../helpers/work-order-mock.factory';

describe('FindWorkOrderByIdUseCase', () => {
  let useCase: FindWorkOrderByIdUseCase;
  let workOrderRepository: jest.Mocked<IWorkOrderRepository>;

  beforeEach(() => {
    workOrderRepository = createMockWorkOrderRepository();
    useCase = new FindWorkOrderByIdUseCase(workOrderRepository);
  });

  it('should return work order when found', async () => {
    const wo = createMockWorkOrder();
    workOrderRepository.findById.mockResolvedValue(wo);

    const result = await useCase.execute(wo.id);

    expect(result).toBe(wo);
    expect(workOrderRepository.findById).toHaveBeenCalledWith(wo.id);
  });

  it('should throw ResourceNotFoundException when not found', async () => {
    workOrderRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
  });
});
