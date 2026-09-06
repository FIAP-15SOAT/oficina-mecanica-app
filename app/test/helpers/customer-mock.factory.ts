import { randomUUID } from 'node:crypto';
import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';

export function createMockPrismaCustomer(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: randomUUID(),
    name: 'João da Silva',
    document: '12345678909',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '11999999999',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockCustomer(overrides: Partial<Customer> = {}): Customer {
  const now = new Date();
  const type = overrides.type ?? CustomerType.INDIVIDUAL;
  const defaultDocument = type === CustomerType.COMPANY ? '12345678000195' : '12345678909';

  return Customer.reconstitute({
    id: randomUUID(),
    name: 'João da Silva',
    document: Document.create(defaultDocument, type),
    type,
    email: Email.create('joao@email.com'),
    phone: Phone.create('11999999999'),
    address: null,
    isActive: true,
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
    hasWorkOrders: jest.fn().mockResolvedValue(false),
  };
}
