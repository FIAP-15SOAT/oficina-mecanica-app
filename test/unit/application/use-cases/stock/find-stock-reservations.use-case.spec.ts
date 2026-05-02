import { FindStockReservationsUseCase } from '@application/use-cases/stock/find-stock-reservations.use-case';
import { createMockStockReservationRepository, createMockStockReservation } from '../../../../helpers/stock-reservation-mock.factory';
import { IStockReservationRepository, StockReservationFilters } from '@domain/interfaces/repositories/stock-reservation.repository.interface';

describe('FindStockReservationsUseCase', () => {
  let useCase: FindStockReservationsUseCase;
  let repository: jest.Mocked<IStockReservationRepository>;
  let partSupplyRepository: any;
  let workOrderRepository: any;

  beforeEach(() => {
    repository = createMockStockReservationRepository();
    useCase = new FindStockReservationsUseCase(repository);
  });

  it('should return paginated stock reservations', async () => {
    const reservation = createMockStockReservation();
    const input = { page: 1, limit: 10 };

    repository.findAllPaginated.mockResolvedValue({ items: [reservation], total: 1 });

    const result = await useCase.execute(input);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toBe(reservation);
    expect(result.pagination.totalRecords).toBe(1);
    expect(result.pagination.page).toBe(1);
    expect(repository.findAllPaginated).toHaveBeenCalledWith({ page: 1, limit: 10 }, {});
  });

  it('should return empty result when no reservations exist', async () => {
    const input = { page: 1, limit: 10 };
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute(input);

    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalRecords).toBe(0);
  });

  it('should calculate pagination correctly', async () => {
    const input = { page: 3, limit: 4 };
    repository.findAllPaginated.mockResolvedValue({ items: [], total: 10 });

    const result = await useCase.execute(input);

    expect(result.pagination.totalPages).toBe(3);
  });
});
