import { randomUUID } from 'node:crypto';
import { ListUserCustomersUseCase } from '@application/use-cases/customer-access/list-user-customers.use-case';
import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('ListUserCustomersUseCase', () => {
  it('should return the customers linked to the user with id, name, type and isActive', async () => {
    const userId = randomUUID();
    const userRepository = { findById: jest.fn().mockResolvedValue({ id: userId }) };
    const customer = Customer.create({
      name: 'Transportadora XYZ',
      document: '12345678000195',
      type: CustomerType.COMPANY,
      email: 'contato@xyz.com',
      phone: '1133330000',
      address: { street: 'Av C', city: 'São Paulo', state: 'SP', zipCode: '03003000' },
    });
    const userCustomerRepository = {
      findCustomersByUserId: jest.fn().mockResolvedValue([customer]),
    };

    const useCase = new ListUserCustomersUseCase(
      userRepository as never,
      userCustomerRepository as never,
    );

    const result = await useCase.execute(userId);

    expect(result).toEqual([
      { id: customer.id, name: customer.name, type: CustomerType.COMPANY, isActive: true },
    ]);
  });

  it('should throw when the user does not exist', async () => {
    const userRepository = { findById: jest.fn().mockResolvedValue(null) };
    const userCustomerRepository = { findCustomersByUserId: jest.fn() };

    const useCase = new ListUserCustomersUseCase(
      userRepository as never,
      userCustomerRepository as never,
    );

    await expect(useCase.execute(randomUUID())).rejects.toThrow(ResourceNotFoundException);
  });
});
