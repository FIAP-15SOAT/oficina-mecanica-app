import { randomUUID } from 'crypto';
import { Quote } from '@domain/entities/quote.entity';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IQuoteServiceRepository } from '@domain/interfaces/repositories/quote-service.repository.interface';
import { IQuotePartSupplyRepository } from '@domain/interfaces/repositories/quote-part-supply.repository.interface';

export function createMockQuote(overrides: Partial<Quote> = {}): Quote {
  const now = new Date();
  return new Quote({
    id: randomUUID(),
    workOrderId: randomUUID(),
    status: QuoteStatus.PENDING,
    notes: null,
    servicesAmount: 0,
    partsAmount: 0,
    totalAmount: 0,
    sentAt: null,
    approvedAt: null,
    rejectedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function createMockQuoteService(overrides: Partial<QuoteService> = {}): QuoteService {
  return new QuoteService({
    quoteId: randomUUID(),
    serviceId: randomUUID(),
    quantity: 1,
    unitPrice: 100,
    totalPrice: 100,
    ...overrides,
  });
}

export function createMockQuotePartSupply(
  overrides: Partial<QuotePartSupply> = {},
): QuotePartSupply {
  return new QuotePartSupply({
    quoteId: randomUUID(),
    partSupplyId: randomUUID(),
    quantity: 2,
    unitPrice: 50,
    totalPrice: 100,
    ...overrides,
  });
}

export function createMockQuoteRepository(): jest.Mocked<IQuoteRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByWorkOrderId: jest.fn(),
    findApprovedByWorkOrderId: jest.fn(),
    findPendingByWorkOrderId: jest.fn(),
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    rejectPendingByWorkOrderId: jest.fn(),
  };
}

export function createMockQuoteServiceRepository(): jest.Mocked<IQuoteServiceRepository> {
  return {
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    findByQuoteId: jest.fn(),
  };
}

export function createMockQuotePartSupplyRepository(): jest.Mocked<IQuotePartSupplyRepository> {
  return {
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    findByQuoteId: jest.fn(),
  };
}
