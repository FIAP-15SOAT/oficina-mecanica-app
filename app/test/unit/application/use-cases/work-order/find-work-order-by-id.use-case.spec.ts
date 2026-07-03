import { FindWorkOrderByIdUseCase } from '@application/use-cases/work-order/find-work-order-by-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import {
  createMockWorkOrder,
  createMockWorkOrderRepository,
} from '../../../../helpers/work-order-mock.factory';

describe('FindWorkOrderByIdUseCase', () => {
  let useCase: FindWorkOrderByIdUseCase;
  let workOrderRepository: jest.Mocked<IWorkOrderRepository>;

  beforeEach(() => {
    workOrderRepository = createMockWorkOrderRepository();
    useCase = new FindWorkOrderByIdUseCase(workOrderRepository);
  });

  it('should return work order when found', async () => {
    const wo = createMockWorkOrder();
    workOrderRepository.findByIdWithDetails.mockResolvedValue(wo);

    const result = await useCase.execute(wo.id);

    expect(result).toBe(wo);
    expect(workOrderRepository.findByIdWithDetails).toHaveBeenCalledWith(wo.id);
  });

  it('should throw ResourceNotFoundException when not found', async () => {
    workOrderRepository.findByIdWithDetails.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
  });
});
