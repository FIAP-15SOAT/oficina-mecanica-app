import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';

describe('CreateCustomerUseCase', () => {
  const validInput = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '(11) 99999-9999',
  };

  it('should create customer when document and email are unique', async () => {
    const repo = createMockCustomerRepository();
    repo.findByDocument.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockResolvedValue(createMockCustomer(validInput));

    const useCase = new CreateCustomerUseCase(repo);
    const result = await useCase.execute(validInput);

    expect(result.name).toBe('João da Silva');
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('should throw ResourceConflictException if document already exists', async () => {
    const repo = createMockCustomerRepository();
    repo.findByDocument.mockResolvedValue(createMockCustomer());
    repo.findByEmail.mockResolvedValue(null);

    const useCase = new CreateCustomerUseCase(repo);
    await expect(useCase.execute(validInput)).rejects.toThrow(ResourceConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException if email already exists', async () => {
    const repo = createMockCustomerRepository();
    repo.findByDocument.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(createMockCustomer());

    const useCase = new CreateCustomerUseCase(repo);
    await expect(useCase.execute(validInput)).rejects.toThrow(ResourceConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
