import { DeleteVehicleUseCase } from '@application/use-cases/vehicle/delete-vehicle.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import {
  createMockVehicle,
  createMockVehicleRepository,
} from '../../../../helpers/vehicle-mock.factory';

describe('DeleteVehicleUseCase', () => {
  let useCase: DeleteVehicleUseCase;
  let vehicleRepository: jest.Mocked<IVehicleRepository>;

  beforeEach(() => {
    vehicleRepository = createMockVehicleRepository();
    useCase = new DeleteVehicleUseCase(vehicleRepository);
  });

  it('should delete vehicle successfully', async () => {
    const vehicle = createMockVehicle();
    vehicleRepository.findById.mockResolvedValue(vehicle);
    vehicleRepository.isVehicleInUse.mockResolvedValue(false);
    vehicleRepository.delete.mockResolvedValue(undefined);

    await useCase.execute(vehicle.id);

    expect(vehicleRepository.delete).toHaveBeenCalledWith(vehicle.id);
  });

  it('should throw ResourceNotFoundException when vehicle not found', async () => {
    vehicleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(ResourceNotFoundException);
    expect(vehicleRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when vehicle has work orders', async () => {
    const vehicle = createMockVehicle();
    vehicleRepository.findById.mockResolvedValue(vehicle);
    vehicleRepository.isVehicleInUse.mockResolvedValue(true);

    await expect(useCase.execute(vehicle.id)).rejects.toThrow(ResourceConflictException);
    expect(vehicleRepository.delete).not.toHaveBeenCalled();
  });
});
