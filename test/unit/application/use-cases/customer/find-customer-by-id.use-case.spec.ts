import { FindCustomerByIdUseCase } from '@application/use-cases/customer/find-customer-by-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';

describe('FindCustomerByIdUseCase', () => {
  let useCase: FindCustomerByIdUseCase;
  let customerRepository: jest.Mocked<ICustomerRepository>;

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    useCase = new FindCustomerByIdUseCase(customerRepository);
  });

  it('should return customer when found', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);

    const result = await useCase.execute(customer.id);

    expect(result).toEqual(customer);
    expect(customerRepository.findById).toHaveBeenCalledWith(customer.id);
  });

  it('should throw ResourceNotFoundException when not found', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-id'))
      .rejects.toThrow(ResourceNotFoundException);
    expect(customerRepository.findById).toHaveBeenCalledWith('non-existent-id');
  });
});
