import { FindAllCustomersUseCase } from '@application/use-cases/customer/find-all-customers.use-case';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';

describe('FindAllCustomersUseCase', () => {
  let useCase: FindAllCustomersUseCase;
  let customerRepository: jest.Mocked<ICustomerRepository>;

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    useCase = new FindAllCustomersUseCase(customerRepository);
  });

  it('should return paginated customers', async () => {
    const customers = [createMockCustomer(), createMockCustomer()];
    customerRepository.findAll.mockResolvedValue({ items: customers, total: 2 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.totalRecords).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('should calculate totalPages correctly', async () => {
    customerRepository.findAll.mockResolvedValue({ items: [], total: 25 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.totalPages).toBe(3);
  });

  it('should pass filters to repository', async () => {
    customerRepository.findAll.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 2, limit: 5, name: 'João' });

    expect(customerRepository.findAll).toHaveBeenCalledWith({ page: 2, limit: 5, name: 'João' });
  });
});
