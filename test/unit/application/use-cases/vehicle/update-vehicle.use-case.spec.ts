import { UpdateVehicleUseCase } from '@application/use-cases/vehicle/update-vehicle.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';
import { createMockVehicle, createMockVehicleRepository } from '../../../../helpers/vehicle-mock.factory';

describe('UpdateVehicleUseCase', () => {
  let useCase: UpdateVehicleUseCase;
  let vehicleRepository: jest.Mocked<IVehicleRepository>;
  let customerRepository: jest.Mocked<ICustomerRepository>;

  beforeEach(() => {
    vehicleRepository = createMockVehicleRepository();
    customerRepository = createMockCustomerRepository();
    useCase = new UpdateVehicleUseCase(vehicleRepository, customerRepository);
  });

  it('should update vehicle successfully', async () => {
    const existing = createMockVehicle({ id: 'veh-1', plate: 'ABC-1234' });
    const updated = createMockVehicle({ id: 'veh-1', brand: 'Honda' });
    vehicleRepository.findById.mockResolvedValue(existing);
    vehicleRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute('veh-1', { brand: 'Honda' });

    expect(result).toEqual(updated);
    expect(vehicleRepository.update).toHaveBeenCalledWith('veh-1', { brand: 'Honda' });
  });

  it('should throw ResourceNotFoundException when vehicle not found', async () => {
    vehicleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent', { brand: 'Honda' }))
      .rejects.toThrow(ResourceNotFoundException);
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when new plate belongs to another vehicle', async () => {
    const existing = createMockVehicle({ id: 'veh-1', plate: 'ABC-1234' });
    const other = createMockVehicle({ id: 'veh-2', plate: 'XYZ-9999' });
    vehicleRepository.findById.mockResolvedValue(existing);
    vehicleRepository.findByPlate.mockResolvedValue(other);

    await expect(useCase.execute('veh-1', { plate: 'XYZ-9999' }))
      .rejects.toThrow(ResourceConflictException);
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when new customerId does not exist', async () => {
    const existing = createMockVehicle({ id: 'veh-1', customerId: 'cust-1' });
    vehicleRepository.findById.mockResolvedValue(existing);
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('veh-1', { customerId: 'cust-999' }))
      .rejects.toThrow(ResourceNotFoundException);
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });

  it('should not check plate uniqueness when plate is unchanged', async () => {
    const existing = createMockVehicle({ id: 'veh-1', plate: 'ABC-1234' });
    vehicleRepository.findById.mockResolvedValue(existing);
    vehicleRepository.update.mockResolvedValue(existing);

    await useCase.execute('veh-1', { plate: 'ABC-1234' });

    expect(vehicleRepository.findByPlate).not.toHaveBeenCalled();
  });
});
