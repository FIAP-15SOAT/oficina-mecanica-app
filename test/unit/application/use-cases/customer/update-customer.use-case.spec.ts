import { UpdateCustomerUseCase } from '@application/use-cases/customer/update-customer.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { UpdateCustomerDto } from '@domain/interfaces/use-cases/customer/dto/update-customer.dto';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';

describe('UpdateCustomerUseCase', () => {
  let useCase: UpdateCustomerUseCase;
  let customerRepository: jest.Mocked<ICustomerRepository>;

  const validInput: UpdateCustomerDto = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '11999999999',
    address: { street: 'Rua das Flores, 123', city: 'São Paulo', state: 'SP', zipCode: '01310-100' },
  };

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    useCase = new UpdateCustomerUseCase(customerRepository);
  });

  it('should update customer successfully', async () => {
    const existing = createMockCustomer({ id: 'cust-1' });
    const updated = createMockCustomer({ id: 'cust-1', name: 'João Atualizado' });
    customerRepository.findById.mockResolvedValue(existing);
    customerRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute('cust-1', { ...validInput, name: 'João Atualizado' });

    expect(result).toEqual(updated);
    expect(customerRepository.update).toHaveBeenCalledWith('cust-1', expect.objectContaining({ name: 'João Atualizado' }));
  });

  it('should throw ResourceNotFoundException when customer not found', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent', validInput))
      .rejects.toThrow(ResourceNotFoundException);
    expect(customerRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when new document belongs to another customer', async () => {
    const existing = createMockCustomer({ id: 'cust-1', document: '111.111.111-11' });
    const other = createMockCustomer({ id: 'cust-2', document: '222.222.222-22' });
    customerRepository.findById.mockResolvedValue(existing);
    customerRepository.findByDocument.mockResolvedValue(other);

    await expect(useCase.execute('cust-1', { ...validInput, document: '222.222.222-22' }))
      .rejects.toThrow(ResourceConflictException);
    expect(customerRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when new email belongs to another customer', async () => {
    const existing = createMockCustomer({ id: 'cust-1', email: 'old@email.com' });
    const other = createMockCustomer({ id: 'cust-2', email: 'taken@email.com' });
    customerRepository.findById.mockResolvedValue(existing);
    customerRepository.findByEmail.mockResolvedValue(other);

    await expect(useCase.execute('cust-1', { ...validInput, email: 'taken@email.com' }))
      .rejects.toThrow(ResourceConflictException);
    expect(customerRepository.findByDocument).not.toHaveBeenCalled();
    expect(customerRepository.update).not.toHaveBeenCalled();
  });

  it('should not check uniqueness when document/email are unchanged', async () => {
    const existing = createMockCustomer({ id: 'cust-1', document: validInput.document, email: validInput.email });
    customerRepository.findById.mockResolvedValue(existing);
    customerRepository.update.mockResolvedValue(existing);

    await useCase.execute('cust-1', validInput);

    expect(customerRepository.findByDocument).not.toHaveBeenCalled();
    expect(customerRepository.findByEmail).not.toHaveBeenCalled();
  });
});
