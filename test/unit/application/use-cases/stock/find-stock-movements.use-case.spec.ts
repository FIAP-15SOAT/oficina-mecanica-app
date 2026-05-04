import { FindStockMovementsUseCase } from '@application/use-cases/stock/find-stock-movements.use-case';
import {
  createMockStockMovementRepository,
  createMockStockMovement,
} from '../../../../helpers/stock-movement-mock.factory';
import { IStockMovementRepository } from '@domain/interfaces/repositories/stock-movement.repository.interface';

describe('FindStockMovementsUseCase', () => {
  let useCase: FindStockMovementsUseCase;
  let repository: jest.Mocked<IStockMovementRepository>;

  beforeEach(() => {
    repository = createMockStockMovementRepository();
    useCase = new FindStockMovementsUseCase(repository);
  });

  it('should return paginated stock movements', async () => {
    const movement = createMockStockMovement();
    const input = { page: 1, limit: 10 };

    repository.findAllPaginated.mockResolvedValue({ items: [movement], total: 1 });

    const result = await useCase.execute(input);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toBe(movement);
    expect(result.pagination.totalRecords).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(repository.findAllPaginated).toHaveBeenCalledWith({ page: 1, limit: 10 }, {});
  });

  it('should return empty result when no movements exist', async () => {
    const input = { page: 1, limit: 10 };
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute(input);

    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalRecords).toBe(0);
  });

  it('should calculate pagination correctly for multiple pages', async () => {
    const input = { page: 2, limit: 5 };
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 12 });

    const result = await useCase.execute(input);

    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.limit).toBe(5);
  });

  it('should pass startDate and endDate filters to the repository', async () => {
    const input = {
      page: 1,
      limit: 10,
      startDate: '2023-01-01',
      endDate: '2023-01-31',
    };

    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute(input);

    expect(repository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      expect.objectContaining({
        startDate: new Date('2023-01-01T00:00:00.000Z'),
        endDate: new Date('2023-01-31T23:59:59.999Z'),
      }),
    );
  });

  it('should return empty result when partSupplyId does not exist', async () => {
    const input = {
      page: 1,
      limit: 10,
      partSupplyId: 'invalid-id',
    };

    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute(input);

    expect(result.items).toHaveLength(0);
    expect(repository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      expect.objectContaining({ partSupplyId: 'invalid-id' }),
    );
  });
});
