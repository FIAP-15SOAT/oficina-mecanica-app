import { randomUUID } from 'node:crypto';
import { UpdateCustomerStatusUseCase } from '@application/use-cases/customer-access/update-customer-status.use-case';
import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

function buildCustomer(): Customer {
  return Customer.create({
    name: 'João da Silva',
    document: '12345678909',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@example.com',
    phone: '11999990000',
    address: { street: 'Rua A', city: 'São Paulo', state: 'SP', zipCode: '01001000' },
  });
}

describe('UpdateCustomerStatusUseCase', () => {
  it('should deactivate an active customer', async () => {
    const customer = buildCustomer();
    const customerRepository = {
      findById: jest.fn().mockResolvedValue(customer),
      update: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };
    const logger = { event: jest.fn() };

    const useCase = new UpdateCustomerStatusUseCase(customerRepository as never, logger as never);

    await useCase.execute(customer.id, false, randomUUID());

    expect(customerRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
    expect(logger.event).toHaveBeenCalled();
  });

  it('should reactivate a deactivated customer', async () => {
    const customer = buildCustomer();
    customer.deactivate();
    const customerRepository = {
      findById: jest.fn().mockResolvedValue(customer),
      update: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };
    const logger = { event: jest.fn() };

    const useCase = new UpdateCustomerStatusUseCase(customerRepository as never, logger as never);

    await useCase.execute(customer.id, true, randomUUID());

    expect(customerRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
  });

  it('should throw when the customer does not exist', async () => {
    const customerRepository = { findById: jest.fn().mockResolvedValue(null), update: jest.fn() };
    const logger = { event: jest.fn() };

    const useCase = new UpdateCustomerStatusUseCase(customerRepository as never, logger as never);

    await expect(useCase.execute(randomUUID(), false, randomUUID())).rejects.toThrow(
      ResourceNotFoundException,
    );
  });
});
