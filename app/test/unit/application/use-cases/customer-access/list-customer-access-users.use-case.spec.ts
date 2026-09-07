import { randomUUID } from 'node:crypto';
import { ListCustomerAccessUsersUseCase } from '@application/use-cases/customer-access/list-customer-access-users.use-case';
import { User } from '@domain/entities/user.entity';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('ListCustomerAccessUsersUseCase', () => {
  it('should return the users linked to the customer', async () => {
    const customerId = randomUUID();
    const customerRepository = { findById: jest.fn().mockResolvedValue({ id: customerId }) };
    const user = User.create({
      name: 'Maria',
      email: 'maria@example.com',
      passwordHash: 'hash',
      role: null,
      cpf: '12345678909',
    });
    const userCustomerRepository = {
      findUsersByCustomerId: jest.fn().mockResolvedValue([user]),
    };

    const useCase = new ListCustomerAccessUsersUseCase(
      customerRepository as never,
      userCustomerRepository as never,
    );

    const result = await useCase.execute(customerId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(user.id);
    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('should throw when the customer does not exist', async () => {
    const customerRepository = { findById: jest.fn().mockResolvedValue(null) };
    const userCustomerRepository = { findUsersByCustomerId: jest.fn() };

    const useCase = new ListCustomerAccessUsersUseCase(
      customerRepository as never,
      userCustomerRepository as never,
    );

    await expect(useCase.execute(randomUUID())).rejects.toThrow(ResourceNotFoundException);
  });
});
