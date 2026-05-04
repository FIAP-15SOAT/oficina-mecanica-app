import { DeleteCustomerUseCase } from '@application/use-cases/customer/delete-customer.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import {
  createMockCustomer,
  createMockCustomerRepository,
} from '../../../../helpers/customer-mock.factory';

describe('DeleteCustomerUseCase', () => {
  let useCase: DeleteCustomerUseCase;
  let customerRepository: jest.Mocked<ICustomerRepository>;

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    useCase = new DeleteCustomerUseCase(customerRepository);
  });

  it('should delete customer when no dependencies exist', async () => {
    customerRepository.findById.mockResolvedValue(createMockCustomer());
    customerRepository.hasVehicles.mockResolvedValue(false);
    customerRepository.hasWorkOrders.mockResolvedValue(false);
    customerRepository.delete.mockResolvedValue(undefined);

    await expect(useCase.execute('some-id')).resolves.toBeUndefined();
    expect(customerRepository.delete).toHaveBeenCalledWith('some-id');
  });

  it('should throw ResourceNotFoundException when customer does not exist', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(ResourceNotFoundException);
    expect(customerRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when customer has vehicles', async () => {
    customerRepository.findById.mockResolvedValue(createMockCustomer());
    customerRepository.hasVehicles.mockResolvedValue(true);
    customerRepository.hasWorkOrders.mockResolvedValue(false);

    await expect(useCase.execute('some-id')).rejects.toThrow(ResourceConflictException);
    expect(customerRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when customer has work orders', async () => {
    customerRepository.findById.mockResolvedValue(createMockCustomer());
    customerRepository.hasVehicles.mockResolvedValue(false);
    customerRepository.hasWorkOrders.mockResolvedValue(true);

    await expect(useCase.execute('some-id')).rejects.toThrow(ResourceConflictException);
    expect(customerRepository.delete).not.toHaveBeenCalled();
  });
});
