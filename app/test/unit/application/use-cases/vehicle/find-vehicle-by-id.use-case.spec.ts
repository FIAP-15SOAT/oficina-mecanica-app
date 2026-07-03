import { FindVehicleByIdUseCase } from '@application/use-cases/vehicle/find-vehicle-by-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import {
  createMockVehicle,
  createMockVehicleRepository,
} from '../../../../helpers/vehicle-mock.factory';

describe('FindVehicleByIdUseCase', () => {
  let useCase: FindVehicleByIdUseCase;
  let vehicleRepository: jest.Mocked<IVehicleRepository>;

  beforeEach(() => {
    vehicleRepository = createMockVehicleRepository();
    useCase = new FindVehicleByIdUseCase(vehicleRepository);
  });

  it('should return vehicle when found', async () => {
    const vehicle = createMockVehicle();
    vehicleRepository.findById.mockResolvedValue(vehicle);

    const result = await useCase.execute(vehicle.id);

    expect(result).toEqual(vehicle);
    expect(vehicleRepository.findById).toHaveBeenCalledWith(vehicle.id);
  });

  it('should throw ResourceNotFoundException when not found', async () => {
    vehicleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(ResourceNotFoundException);
    expect(vehicleRepository.findById).toHaveBeenCalledWith('non-existent');
  });
});
