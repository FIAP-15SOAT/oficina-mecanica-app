import { CreateVehicleUseCase } from '@application/use-cases/vehicle/create-vehicle.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import {
  createMockCustomer,
  createMockCustomerRepository,
} from '../../../../helpers/customer-mock.factory';
import {
  createMockVehicle,
  createMockVehicleRepository,
} from '../../../../helpers/vehicle-mock.factory';
import { randomUUID } from 'node:crypto';
import { Plate } from '@domain/value-objects/plate.vo';

describe('CreateVehicleUseCase', () => {
  let useCase: CreateVehicleUseCase;
  let vehicleRepository: jest.Mocked<IVehicleRepository>;
  let customerRepository: jest.Mocked<ICustomerRepository>;

  const customerId = randomUUID();
  const validInput = {
    customerId,
    plate: 'ABC-1234',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
  };

  beforeEach(() => {
    vehicleRepository = createMockVehicleRepository();
    customerRepository = createMockCustomerRepository();
    useCase = new CreateVehicleUseCase(vehicleRepository, customerRepository);
  });

  it('should create vehicle when customer exists and plate is unique', async () => {
    const customer = createMockCustomer({ id: customerId });
    const saved = createMockVehicle({ ...validInput, plate: Plate.create('ABC1234') });
    customerRepository.findById.mockResolvedValue(customer);
    vehicleRepository.findByPlate.mockResolvedValue(null);
    vehicleRepository.create.mockResolvedValue(saved);

    const result = await useCase.execute(validInput);

    expect(result).toEqual(saved);
    expect(customerRepository.findById).toHaveBeenCalledWith(customerId);
    expect(vehicleRepository.findByPlate).toHaveBeenCalledWith('ABC1234');
    expect(vehicleRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should throw ResourceNotFoundException when customer does not exist', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow(ResourceNotFoundException);
    expect(vehicleRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when plate already exists', async () => {
    customerRepository.findById.mockResolvedValue(createMockCustomer({ id: customerId }));
    vehicleRepository.findByPlate.mockResolvedValue(createMockVehicle());

    await expect(useCase.execute(validInput)).rejects.toThrow(ResourceConflictException);
    expect(vehicleRepository.create).not.toHaveBeenCalled();
  });

  it('should normalize plate to uppercase before uniqueness check', async () => {
    customerRepository.findById.mockResolvedValue(createMockCustomer({ id: customerId }));
    vehicleRepository.findByPlate.mockResolvedValue(null);
    vehicleRepository.create.mockResolvedValue(createMockVehicle());

    await useCase.execute({ ...validInput, plate: 'abc-1234' });

    expect(vehicleRepository.findByPlate).toHaveBeenCalledWith('ABC1234');
  });

  it('should reject creating a vehicle for an inactive customer', async () => {
    const customer = createMockCustomer({ id: customerId });
    customer.deactivate();
    customerRepository.findById.mockResolvedValue(customer);

    await expect(useCase.execute(validInput)).rejects.toThrow(BusinessRuleViolationException);
  });
});
