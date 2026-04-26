import { UpdateVehicleUseCase } from '@application/use-cases/vehicle/update-vehicle.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { UpdateVehicleDto } from '@domain/interfaces/use-cases/vehicle/dto/update-vehicle.dto';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';
import { createMockVehicle, createMockVehicleRepository } from '../../../../helpers/vehicle-mock.factory';

describe('UpdateVehicleUseCase', () => {
  let useCase: UpdateVehicleUseCase;
  let vehicleRepository: jest.Mocked<IVehicleRepository>;
  let customerRepository: jest.Mocked<ICustomerRepository>;

  const validInput: UpdateVehicleDto = {
    customerId: 'cust-1',
    plate: 'ABC-1234',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
  };

  beforeEach(() => {
    vehicleRepository = createMockVehicleRepository();
    customerRepository = createMockCustomerRepository();
    useCase = new UpdateVehicleUseCase(vehicleRepository, customerRepository);
  });

  it('should update vehicle successfully', async () => {
    const existing = createMockVehicle({ id: 'veh-1', customerId: 'cust-1', plate: 'ABC-1234' });
    const updated = createMockVehicle({ id: 'veh-1', brand: 'Honda' });
    vehicleRepository.findById.mockResolvedValue(existing);
    customerRepository.findById.mockResolvedValue(createMockCustomer({ id: 'cust-1' }));
    vehicleRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute('veh-1', { ...validInput, brand: 'Honda' });

    expect(result).toEqual(updated);
    expect(vehicleRepository.update).toHaveBeenCalledWith('veh-1', expect.objectContaining({ brand: 'Honda' }));
  });

  it('should throw ResourceNotFoundException when vehicle not found', async () => {
    vehicleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent', validInput))
      .rejects.toThrow(ResourceNotFoundException);
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when new plate belongs to another vehicle', async () => {
    const existing = createMockVehicle({ id: 'veh-1', customerId: 'cust-1', plate: 'ABC-1234' });
    const other = createMockVehicle({ id: 'veh-2', plate: 'XYZ-9999' });
    vehicleRepository.findById.mockResolvedValue(existing);
    customerRepository.findById.mockResolvedValue(createMockCustomer({ id: 'cust-1' }));
    vehicleRepository.findByPlate.mockResolvedValue(other);

    await expect(useCase.execute('veh-1', { ...validInput, plate: 'XYZ-9999' }))
      .rejects.toThrow(ResourceConflictException);
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when new customerId does not exist', async () => {
    const existing = createMockVehicle({ id: 'veh-1', customerId: 'cust-1' });
    vehicleRepository.findById.mockResolvedValue(existing);
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('veh-1', { ...validInput, customerId: 'cust-999' }))
      .rejects.toThrow(ResourceNotFoundException);
    expect(vehicleRepository.update).not.toHaveBeenCalled();
  });

  it('should not check plate uniqueness when plate is unchanged', async () => {
    const existing = createMockVehicle({ id: 'veh-1', customerId: 'cust-1', plate: 'ABC-1234' });
    vehicleRepository.findById.mockResolvedValue(existing);
    customerRepository.findById.mockResolvedValue(createMockCustomer({ id: 'cust-1' }));
    vehicleRepository.update.mockResolvedValue(existing);

    await useCase.execute('veh-1', validInput);

    expect(vehicleRepository.findByPlate).not.toHaveBeenCalled();
  });

  it('should normalize plate to uppercase and pass it to the repository', async () => {
    const existing = createMockVehicle({ id: 'veh-1', customerId: 'cust-1', plate: 'ABC-1234' });
    const updated = createMockVehicle({ id: 'veh-1', plate: 'XYZ-9999' });
    vehicleRepository.findById.mockResolvedValue(existing);
    customerRepository.findById.mockResolvedValue(createMockCustomer({ id: 'cust-1' }));
    vehicleRepository.findByPlate.mockResolvedValue(null);
    vehicleRepository.update.mockResolvedValue(updated);

    await useCase.execute('veh-1', { ...validInput, plate: 'xyz-9999' });

    expect(vehicleRepository.findByPlate).toHaveBeenCalledWith('XYZ-9999');
    expect(vehicleRepository.update).toHaveBeenCalledWith('veh-1', expect.objectContaining({ plate: 'XYZ-9999' }));
  });
});
