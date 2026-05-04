import { randomUUID } from 'node:crypto';
import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';

export function createMockVehicleCustomer(overrides: Partial<Customer> = {}): Customer {
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

export function createMockVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  const now = new Date();
  return new Vehicle({
    id: randomUUID(),
    customerId: randomUUID(),
    plate: 'ABC-1234',
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

export function createMockVehicleRepository(): jest.Mocked<IVehicleRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByPlate: jest.fn(),
    findAllPaginated: jest.fn(),
    findAllByCustomerId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    hasWorkOrders: jest.fn(),
  };
}
