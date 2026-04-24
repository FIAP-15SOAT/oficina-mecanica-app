import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let customerRepository: jest.Mocked<ICustomerRepository>;

  const validInput = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '(11) 99999-9999',
  };

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    useCase = new CreateCustomerUseCase(customerRepository);
  });

  it('should create customer when document and email are unique', async () => {
    const saved = createMockCustomer(validInput);
    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(null);
    customerRepository.create.mockResolvedValue(saved);

    const result = await useCase.execute(validInput);

    expect(result).toEqual(saved);
    expect(customerRepository.findByDocument).toHaveBeenCalledWith(validInput.document);
    expect(customerRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should throw ResourceConflictException if document already exists', async () => {
    customerRepository.findByDocument.mockResolvedValue(createMockCustomer());
    customerRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow(ResourceConflictException);
    expect(customerRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException if email already exists', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(createMockCustomer());

    await expect(useCase.execute(validInput)).rejects.toThrow(ResourceConflictException);
    expect(customerRepository.create).not.toHaveBeenCalled();
  });
});
