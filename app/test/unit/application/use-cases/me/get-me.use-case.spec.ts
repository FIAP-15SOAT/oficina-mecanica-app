import { randomUUID } from 'node:crypto';
import { GetMeUseCase } from '@application/use-cases/me/get-me.use-case';
import { User } from '@domain/entities/user.entity';
import { Customer } from '@domain/entities/customer.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('GetMeUseCase', () => {
  it('should return role and customers for an internal principal with links', async () => {
    const user = User.create({
      name: 'Ana',
      email: 'ana@example.com',
      passwordHash: 'hash',
      role: UserRole.ATTENDANT,
    });
    const customer = Customer.create({
      name: 'Ana',
      document: '12345678909',
      type: CustomerType.INDIVIDUAL,
      email: 'ana@example.com',
      phone: '11999990000',
      address: { street: 'Rua A', city: 'SP', state: 'SP', zipCode: '01001000' },
    });
    const userRepository = { findById: jest.fn().mockResolvedValue(user) };
    const userCustomerRepository = {
      findCustomersByUserId: jest.fn().mockResolvedValue([customer]),
    };

    const useCase = new GetMeUseCase(userRepository as never, userCustomerRepository as never);

    const result = await useCase.execute({
      sub: user.id,
      authFlow: 'INTERNAL',
      email: user.email.value,
      role: UserRole.ATTENDANT,
    });

    expect(result).toEqual({
      id: user.id,
      name: 'Ana',
      email: 'ana@example.com',
      role: UserRole.ATTENDANT,
      customers: [{ id: customer.id, name: 'Ana', type: CustomerType.INDIVIDUAL }],
    });
  });

  it('should return role null and customers for a purely external principal', async () => {
    const user = User.create({
      name: 'Maria',
      email: 'maria@example.com',
      passwordHash: 'hash',
      role: null,
      cpf: '12345678909',
    });
    const userRepository = { findById: jest.fn().mockResolvedValue(user) };
    const userCustomerRepository = { findCustomersByUserId: jest.fn().mockResolvedValue([]) };

    const useCase = new GetMeUseCase(userRepository as never, userCustomerRepository as never);

    const result = await useCase.execute({
      sub: user.id,
      authFlow: 'CUSTOMER',
      email: user.email.value,
    });

    expect(result.role).toBeNull();
    expect(result.customers).toEqual([]);
  });

  it('should throw when the user no longer exists', async () => {
    const userRepository = { findById: jest.fn().mockResolvedValue(null) };
    const userCustomerRepository = { findCustomersByUserId: jest.fn() };

    const useCase = new GetMeUseCase(userRepository as never, userCustomerRepository as never);

    await expect(
      useCase.execute({ sub: randomUUID(), authFlow: 'CUSTOMER', email: 'x@example.com' }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
