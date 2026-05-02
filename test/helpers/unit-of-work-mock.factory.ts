import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import { createMockWorkOrderRepository } from './work-order-mock.factory';
import { createMockWorkOrderServiceRepository } from './work-order-service-mock.factory';
import { createMockStatusHistoryRepository } from './status-history-mock.factory';
import { createMockStockMovementRepository } from './stock-movement-mock.factory';
import { createMockStockReservationRepository } from './stock-reservation-mock.factory';
import { createMockQuoteRepository, createMockQuoteServiceRepository, createMockQuotePartSupplyRepository } from './quote-mock.factory';
import { createMockPartSupplyRepository } from './part-supply-mock.factory';

export function createMockRepositories(): jest.Mocked<IRepositories> {
  return {
    customer: {
      create: jest.fn(),
      findById: jest.fn(),
      findByDocument: jest.fn(),
      findAllPaginated: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasVehicles: jest.fn(),
      hasWorkOrders: jest.fn(),
    } as any,
    vehicle: {
      create: jest.fn(),
      findById: jest.fn(),
      findByPlate: jest.fn(),
      findAllPaginated: jest.fn(),
      findByCustomerId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasWorkOrders: jest.fn(),
    } as any,
    workOrder: createMockWorkOrderRepository() as any,
    workOrderService: createMockWorkOrderServiceRepository(),
    workOrderPartSupply: {
      create: jest.fn(),
      findByWorkOrderId: jest.fn(),
      createMany: jest.fn(),
    } as any,
    quote: createMockQuoteRepository(),
    quoteService: createMockQuoteServiceRepository(),
    quotePartSupply: createMockQuotePartSupplyRepository(),
    statusHistory: createMockStatusHistoryRepository(),
    stockReservation: createMockStockReservationRepository(),
    stockMovement: createMockStockMovementRepository() as any,
    partSupply: createMockPartSupplyRepository(),
    service: {
      create: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findAllPaginated: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasWorkOrderServices: jest.fn(),
      hasQuoteServices: jest.fn(),
      getServiceMetrics: jest.fn(),
      getAllServicesMetrics: jest.fn(),
    } as any,
    user: {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findAllPaginated: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any,
  };
}

export function createMockUnitOfWork(): jest.Mocked<IUnitOfWork> {
  const repos = createMockRepositories();
  return {
    executeTransaction: jest.fn().mockImplementation((work) => work(repos)),
  };
}

export function createMockUnitOfWorkWithRepos(): {
  unitOfWork: jest.Mocked<IUnitOfWork>;
  repos: jest.Mocked<IRepositories>;
} {
  const repos = createMockRepositories();
  const unitOfWork: jest.Mocked<IUnitOfWork> = {
    executeTransaction: jest.fn().mockImplementation((work) => work(repos)),
  };
  return { unitOfWork, repos };
}
