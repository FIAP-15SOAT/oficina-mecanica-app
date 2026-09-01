import { randomUUID } from 'node:crypto';

import { MePresenter } from '@interface-adapters/me/me.presenter';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { UserRole } from '@domain/enums/user-role.enum';
import { GetMeOutputDto } from '@application/ports/input/me/dto/get-me.dto';

import { createMockWorkOrder } from '../../../helpers/work-order-mock.factory';
import { createMockVehicle } from '../../../helpers/vehicle-mock.factory';
import {
  createMockQuote,
  createMockQuoteService,
  createMockQuotePartSupply,
} from '../../../helpers/quote-mock.factory';
import { createMockService } from '../../../helpers/service-mock.factory';
import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';

describe('MePresenter', () => {
  describe('toMeDataResponse', () => {
    it('should wrap the result in a data property', () => {
      const result: GetMeOutputDto = {
        id: randomUUID(),
        name: 'João da Silva',
        email: 'joao@example.com',
        role: UserRole.ATTENDANT,
        customers: [
          { id: randomUUID(), name: 'Oficina Parceira LTDA', type: CustomerType.COMPANY },
        ],
      };

      expect(MePresenter.toMeDataResponse(result)).toEqual({ data: result });
    });
  });

  describe('toWorkOrderResponse', () => {
    it('should map a work order with a vehicle', () => {
      const vehicle = createMockVehicle({ brand: 'Toyota', model: 'Corolla' });
      const workOrder = createMockWorkOrder({ vehicle, problemDescription: 'Barulho no motor' });

      const response = MePresenter.toWorkOrderResponse(workOrder);

      expect(response.id).toBe(workOrder.id);
      expect(response.problemDescription).toBe('Barulho no motor');
      expect(response.vehicle).toEqual({
        id: vehicle.id,
        plate: vehicle.plate.value,
        brand: 'Toyota',
        model: 'Corolla',
      });
    });

    it('should map a work order without a vehicle as null', () => {
      const workOrder = createMockWorkOrder({ vehicle: undefined });

      const response = MePresenter.toWorkOrderResponse(workOrder);

      expect(response.vehicle).toBeNull();
    });
  });

  describe('toWorkOrderDataResponse', () => {
    it('should wrap the work order response in a data property', () => {
      const workOrder = createMockWorkOrder({ vehicle: undefined });

      expect(MePresenter.toWorkOrderDataResponse(workOrder)).toEqual({
        data: MePresenter.toWorkOrderResponse(workOrder),
      });
    });
  });

  describe('toWorkOrderPaginatedResponse', () => {
    it('should map items and build pagination metadata', () => {
      const workOrders = [createMockWorkOrder({ vehicle: undefined })];

      const response = MePresenter.toWorkOrderPaginatedResponse(
        { items: workOrders, total: 1 },
        { page: 1, limit: 10 },
      );

      expect(response.data).toEqual([MePresenter.toWorkOrderResponse(workOrders[0])]);
      expect(response.pagination).toEqual({
        totalRecords: 1,
        totalPages: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('toQuoteResponse', () => {
    it('should map services and parts supplies with their names', () => {
      const service = createMockService({ name: 'Troca de óleo' });
      const partSupply = createMockPartSupply({ name: 'Filtro de óleo' });
      const quoteService = createMockQuoteService({
        serviceId: service.id,
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
      });
      quoteService.service = service;
      const quotePartSupply = createMockQuotePartSupply({
        partSupplyId: partSupply.id,
        quantity: 1,
        unitPrice: 30,
        totalPrice: 30,
      });
      quotePartSupply.partSupply = partSupply;

      const quote = createMockQuote({
        status: QuoteStatus.SENT,
        services: [quoteService],
        partsSupplies: [quotePartSupply],
      });

      const response = MePresenter.toQuoteResponse(quote);

      expect(response.id).toBe(quote.id);
      expect(response.status).toBe(QuoteStatus.SENT);
      expect(response.services).toEqual([
        { id: service.id, name: 'Troca de óleo', quantity: 2, unitPrice: 50, totalPrice: 100 },
      ]);
      expect(response.partsSupplies).toEqual([
        { id: partSupply.id, name: 'Filtro de óleo', quantity: 1, unitPrice: 30, totalPrice: 30 },
      ]);
    });

    it('should default the item name to an empty string when the reference is not loaded', () => {
      const quoteService = createMockQuoteService();
      const quotePartSupply = createMockQuotePartSupply();
      const quote = createMockQuote({
        services: [quoteService],
        partsSupplies: [quotePartSupply],
      });

      const response = MePresenter.toQuoteResponse(quote);

      expect(response.services[0].name).toBe('');
      expect(response.partsSupplies[0].name).toBe('');
    });
  });

  describe('toQuoteDataResponse', () => {
    it('should wrap the quote response in a data property', () => {
      const quote = createMockQuote();

      expect(MePresenter.toQuoteDataResponse(quote)).toEqual({
        data: MePresenter.toQuoteResponse(quote),
      });
    });
  });

  describe('toQuoteListResponse', () => {
    it('should map every quote and wrap them in a data property', () => {
      const quotes = [createMockQuote(), createMockQuote()];

      expect(MePresenter.toQuoteListResponse(quotes)).toEqual({
        data: quotes.map((quote) => MePresenter.toQuoteResponse(quote)),
      });
    });
  });
});
