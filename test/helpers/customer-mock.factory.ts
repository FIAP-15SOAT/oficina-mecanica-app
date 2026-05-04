import { randomUUID } from 'node:crypto';
import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';

export function createMockCustomer(overrides: Partial<Customer> = {}): Customer {
  const now = new Date();
  return new Customer({
    id: randomUUID(),
    name: 'João da Silva',
    document: '12345678909',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '11999999999',
    address: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function createMockCustomerRepository(): jest.Mocked<ICustomerRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByDocument: jest.fn(),
    findByEmail: jest.fn(),
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isCustomerInUse: jest.fn(),
  };
}
