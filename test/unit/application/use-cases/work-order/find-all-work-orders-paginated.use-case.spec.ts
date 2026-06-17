import { FindAllWorkOrdersPaginatedUseCase } from '@application/use-cases/work-order/find-all-work-orders-paginated.use-case';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import {
  createMockWorkOrder,
  createMockWorkOrderRepository,
} from '../../../../helpers/work-order-mock.factory';

describe('FindAllWorkOrdersPaginatedUseCase', () => {
  let useCase: FindAllWorkOrdersPaginatedUseCase;
  let workOrderRepository: jest.Mocked<IWorkOrderRepository>;

  const DEFAULT_SORT = [
    new SortCriterion('status', SortDirection.DESC),
    new SortCriterion('createdAt', SortDirection.ASC),
  ];

  beforeEach(() => {
    workOrderRepository = createMockWorkOrderRepository();
    useCase = new FindAllWorkOrdersPaginatedUseCase(workOrderRepository);
  });

  it('should return paginated work orders', async () => {
    const wo = createMockWorkOrder();
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [wo], total: 1 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.totalRecords).toBe(1);
    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      {},
      DEFAULT_SORT,
    );
  });

  it('should apply default sort when sort is not provided', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, limit: 10 });

    const call = workOrderRepository.findAllPaginated.mock.calls[0][2];
    expect(call).toEqual(DEFAULT_SORT);
  });

  it('should parse and forward explicit sort param', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, limit: 10, sort: 'createdAt:asc' });

    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      {},
      [new SortCriterion('createdAt', SortDirection.ASC)],
    );
  });

  it('should pass filters alongside sort', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 2, limit: 5, customerId: 'cust-1' });

    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 2, limit: 5 },
      { customerId: 'cust-1' },
      DEFAULT_SORT,
    );
  });

  it('should throw DomainValidationException for disallowed sort field', async () => {
    await expect(
      useCase.execute({ page: 1, limit: 10, sort: 'number:asc' }),
    ).rejects.toThrow(DomainValidationException);
  });

  it('should throw DomainValidationException for invalid sort format', async () => {
    await expect(
      useCase.execute({ page: 1, limit: 10, sort: 'status:invalid' }),
    ).rejects.toThrow(DomainValidationException);
  });
});
