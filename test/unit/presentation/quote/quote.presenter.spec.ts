import { randomUUID } from 'node:crypto';
import { Quote } from '@domain/entities/quote.entity';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuotePresenter } from '@presentation/quote/quote.presenter';
import { createMockWorkOrder } from '../../../helpers/work-order-mock.factory';
import { createMockCustomer } from '../../../helpers/customer-mock.factory';
import { createMockVehicle } from '../../../helpers/vehicle-mock.factory';
import { createMockService } from '../../../helpers/service-mock.factory';
import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';

describe('QuotePresenter', () => {
  function buildQuoteWithWorkOrder(extra: object = {}) {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: customer.id });
    const workOrder = createMockWorkOrder({ customer, vehicle });

    const now = new Date();
    const quote = Quote.reconstitute({
      id: randomUUID(),
      workOrderId: workOrder.id,
      servicesAmount: 150,
      partsAmount: 50,
      totalAmount: 200,
      version: 0,
      status: QuoteStatus.PENDING,
      notes: 'test notes',
      sentAt: now,
      approvedAt: null,
      rejectedAt: null,
      createdAt: now,
      updatedAt: now,
      ...extra,
    });
    quote.workOrder = workOrder;
    return quote;
  }

  describe('toResponse', () => {
    it('should format a quote with workOrder correctly', () => {
      const quote = buildQuoteWithWorkOrder();
      const response = QuotePresenter.toResponse(quote);
      expect(response.id).toBe(quote.id);
      expect(response.totalAmount).toBe(200);
      expect(response.workOrder).toBeDefined();
      expect(response.workOrder.id).toBe(quote.workOrder!.id);
      expect((response as unknown as Record<string, unknown>)['workOrderId']).toBeUndefined();
      expect(response.workOrder.services).toBeUndefined();
      expect(response.workOrder.partSupplies).toBeUndefined();
    });
  });

  describe('toDataResponse', () => {
    it('should wrap response in data property', () => {
      const quote = buildQuoteWithWorkOrder();
      const response = QuotePresenter.toDataResponse(quote);
      expect(response.data.id).toBe(quote.id);
      expect(response.data.workOrder).toBeDefined();
    });
  });

  describe('toWithItemsResponse', () => {
    it('should include services and parts with enrichment data', () => {
      const service = createMockService({ name: 'Troca de óleo', description: 'Com filtro' });
      const partSupply = createMockPartSupply({ name: 'Filtro de Óleo', sku: 'FO-001' });

      const qs = QuoteService.reconstitute({
        quoteId: randomUUID(),
        serviceId: service.id,
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      qs.service = service;

      const qp = QuotePartSupply.reconstitute({
        quoteId: randomUUID(),
        partSupplyId: partSupply.id,
        quantity: 1,
        unitPrice: 45,
        totalPrice: 45,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      qp.partSupply = partSupply;

      const quote = buildQuoteWithWorkOrder({ services: [qs], partsSupplies: [qp] });
      const response = QuotePresenter.toWithItemsResponse(quote);

      expect(response.data.services).toHaveLength(1);
      expect(response.data.partsSupplies).toHaveLength(1);
      expect(response.data.services[0].id).toBe(service.id);
      expect(response.data.services[0].name).toBe('Troca de óleo');
      expect(response.data.services[0].description).toBe('Com filtro');
      expect(response.data.partsSupplies[0].id).toBe(partSupply.id);
      expect(response.data.partsSupplies[0].name).toBe('Filtro de Óleo');
      expect(response.data.partsSupplies[0].sku).toBe('FO-001');
    });

    it('should return empty arrays when quote has no items', () => {
      const quote = buildQuoteWithWorkOrder({ services: [], partsSupplies: [] });
      const response = QuotePresenter.toWithItemsResponse(quote);
      expect(response.data.services).toEqual([]);
      expect(response.data.partsSupplies).toEqual([]);
    });

    it('should include partSupply with null partNumber when not set', () => {
      const partSupply = createMockPartSupply({ partNumber: undefined });
      const qp = QuotePartSupply.reconstitute({
        quoteId: randomUUID(),
        partSupplyId: partSupply.id,
        quantity: 1,
        unitPrice: 20,
        totalPrice: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      qp.partSupply = partSupply;

      const quote = buildQuoteWithWorkOrder({ services: [], partsSupplies: [qp] });
      const response = QuotePresenter.toWithItemsResponse(quote);

      expect(response.data.partsSupplies[0].partNumber).toBeNull();
    });
  });

  describe('toPaginatedResponse', () => {
    it('should format paginated result correctly', () => {
      const quote = buildQuoteWithWorkOrder();
      const paginatedResult = {
        items: [quote],
        pagination: {
          totalRecords: 1,
          totalPages: 1,
          page: 1,
          limit: 10,
        },
      };

      const response = QuotePresenter.toPaginatedResponse(paginatedResult);

      expect(response.data).toHaveLength(1);
      expect(response.data[0].id).toBe(quote.id);
      expect(response.data[0].workOrder).toBeDefined();
      expect(response.pagination).toEqual(paginatedResult.pagination);
    });
  });

  describe('toListResponse', () => {
    it('should format list result correctly', () => {
      const quote = buildQuoteWithWorkOrder();
      const response = QuotePresenter.toListResponse([quote]);

      expect(response.data).toHaveLength(1);
      expect(response.data[0].id).toBe(quote.id);
      expect(response.data[0].workOrder).toBeDefined();
    });
  });
});
