import { FindVehiclesByCustomerIdUseCase } from '@application/use-cases/vehicle/find-vehicles-by-customer-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { createMockVehicle, createMockVehicleRepository } from '../../../../helpers/vehicle-mock.factory';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';

describe('FindVehiclesByCustomerIdUseCase', () => {
  let useCase: FindVehiclesByCustomerIdUseCase;
  let vehicleRepository: jest.Mocked<IVehicleRepository>;
  let customerRepository: jest.Mocked<ICustomerRepository>;

  beforeEach(() => {
    vehicleRepository = createMockVehicleRepository();
    customerRepository = createMockCustomerRepository();
    useCase = new FindVehiclesByCustomerIdUseCase(vehicleRepository, customerRepository);
  });

  it('should return all vehicles for a valid customer', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: customer.id });

    customerRepository.findById.mockResolvedValue(customer);
    vehicleRepository.findAllByCustomerId.mockResolvedValue([vehicle]);

    const result = await useCase.execute(customer.id);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(vehicle);
    expect(customerRepository.findById).toHaveBeenCalledWith(customer.id);
    expect(vehicleRepository.findAllByCustomerId).toHaveBeenCalledWith(customer.id);
  });

  it('should throw ResourceNotFoundException when customer not found', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('nonexistent-id'),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(vehicleRepository.findAllByCustomerId).not.toHaveBeenCalled();
  });

  it('should return empty list when customer has no vehicles', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    vehicleRepository.findAllByCustomerId.mockResolvedValue([]);

    const result = await useCase.execute(customer.id);

    expect(result).toHaveLength(0);
  });
});
