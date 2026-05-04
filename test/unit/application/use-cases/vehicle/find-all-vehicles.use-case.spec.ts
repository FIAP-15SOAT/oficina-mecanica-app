import { FindAllVehiclesUseCase } from '@application/use-cases/vehicle/find-all-vehicles.use-case';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { createMockVehicle, createMockVehicleRepository } from '../../../../helpers/vehicle-mock.factory';

describe('FindAllVehiclesUseCase', () => {
  let useCase: FindAllVehiclesUseCase;
  let vehicleRepository: jest.Mocked<IVehicleRepository>;

  beforeEach(() => {
    vehicleRepository = createMockVehicleRepository();
    useCase = new FindAllVehiclesUseCase(vehicleRepository);
  });

  it('should return paginated vehicles', async () => {
    const vehicles = [createMockVehicle(), createMockVehicle()];
    vehicleRepository.findAllPaginated.mockResolvedValue({ items: vehicles, total: 2 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toEqual(vehicles);
    expect(result.items).toHaveLength(2);
    expect(result.pagination.totalRecords).toBe(2);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
  });

  it('should calculate totalPages correctly', async () => {
    vehicleRepository.findAllPaginated.mockResolvedValue({ items: [], total: 25 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.pagination.totalPages).toBe(3);
  });

  it('should pass filters to repository', async () => {
    vehicleRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 2, limit: 5, brand: 'Toyota' });

    expect(vehicleRepository.findAllPaginated).toHaveBeenCalledWith({ page: 2, limit: 5 }, { brand: 'Toyota' });
  });
});
