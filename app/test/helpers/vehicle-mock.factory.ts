import { randomUUID } from 'node:crypto';
import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';
import { Plate } from '@domain/value-objects/plate.vo';

export function createMockVehicleCustomer(overrides: Partial<Customer> = {}): Customer {
  const now = new Date();
  const type = overrides.type ?? CustomerType.INDIVIDUAL;

  return Customer.reconstitute({
    id: randomUUID(),
    name: 'João da Silva',
    document: Document.create('12345678909', type),
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

export function createMockVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  const now = new Date();

  return Vehicle.reconstitute({
    id: randomUUID(),
    customerId: randomUUID(),
    plate: Plate.create('ABC-1234'),
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    color: null,
    mileage: null,
    customer: createMockVehicleCustomer(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function createMockPrismaVehicle(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: randomUUID(),
    customerId: randomUUID(),
    plate: 'ABC1234',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    color: null,
    mileage: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockVehicleRepository(): jest.Mocked<IVehicleRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByPlate: jest.fn(),
    findAllPaginated: jest.fn(),
    findAllByCustomerId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isVehicleInUse: jest.fn(),
  };
}
