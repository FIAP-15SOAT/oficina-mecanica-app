import { randomUUID } from 'crypto';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';

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
    customer: undefined,
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
    update: jest.fn(),
    delete: jest.fn(),
    hasWorkOrders: jest.fn(),
  };
}
