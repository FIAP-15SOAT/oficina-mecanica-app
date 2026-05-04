import { FindAllWorkOrdersPaginatedUseCase } from '@application/use-cases/work-order/find-all-work-orders-paginated.use-case';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import {
  createMockWorkOrder,
  createMockWorkOrderRepository,
} from '../../../../helpers/work-order-mock.factory';

describe('FindAllWorkOrdersPaginatedUseCase', () => {
  let useCase: FindAllWorkOrdersPaginatedUseCase;
  let workOrderRepository: jest.Mocked<IWorkOrderRepository>;

  beforeEach(() => {
    workOrderRepository = createMockWorkOrderRepository();
    useCase = new FindAllWorkOrdersPaginatedUseCase(workOrderRepository);
  });

  it('should return paginated work orders', async () => {
    const wo = createMockWorkOrder();
    const input = { page: 1, limit: 10 };

    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [wo], total: 1 });

    const result = await useCase.execute(input);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toBe(wo);
    expect(result.pagination.totalRecords).toBe(1);
    expect(result.pagination.page).toBe(1);
    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith({ page: 1, limit: 10 }, {});
  });

  it('should return empty when no work orders', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalRecords).toBe(0);
  });

  it('should pass filters to repository', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });
    const input = { page: 2, limit: 5, customerId: 'cust-1' };

    await useCase.execute(input);

    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 2, limit: 5 },
      { customerId: 'cust-1' },
    );
  });
});
