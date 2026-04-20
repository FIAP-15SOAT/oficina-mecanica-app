import { randomUUID } from 'crypto';
import { Service } from '@domain/entities/service.entity';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';

export function createMockService(overrides: Partial<Service> = {}): Service {
  const now = new Date();

  return new Service({
    id: randomUUID(),
    name: 'Oil Change',
    description: 'Full engine oil change',
    basePrice: 99.99,
    estimatedTimeMin: 30,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function createMockServiceRepository(): jest.Mocked<IServiceRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}
