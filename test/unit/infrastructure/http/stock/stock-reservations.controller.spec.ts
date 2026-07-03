import { randomUUID } from 'node:crypto';

import { StockReservationsController } from '@infrastructure/http/stock/stock-reservations.controller';

import { StockController } from '@interface-adapters/stock/stock.controller';
import { StockPresenter } from '@interface-adapters/stock/stock.presenter';

import { FindStockReservationsQueryDto } from '@infrastructure/http/stock/dto/requests/filter-stock-reservations.dto';
import { StockReservation } from '@domain/entities/stock-reservation.entity';

import { createMockPartSupply } from '../../../../helpers/part-supply-mock.factory';
import { createMockCustomer } from '../../../../helpers/customer-mock.factory';
import { createMockVehicle } from '../../../../helpers/vehicle-mock.factory';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';

describe('StockReservationsController', () => {
  let httpController: StockReservationsController;
  let cleanController: StockController;

  beforeEach(() => {
    cleanController = new StockController({ execute: jest.fn() }, { execute: jest.fn() });
    httpController = new StockReservationsController(cleanController);
  });

  describe('getStockReservations', () => {
    it('should pass the query straight to the clean controller and return its result', async () => {
      const partSupply = createMockPartSupply();
      const customer = createMockCustomer();
      const vehicle = createMockVehicle({ customerId: customer.id, customer });
      const workOrder = createMockWorkOrder({ customer, vehicle });
      const reservation = StockReservation.reconstitute({
        id: randomUUID(),
        partSupplyId: partSupply.id,
        workOrderId: workOrder.id,
        quantity: 3,
        createdAt: new Date(),
      });
      reservation.partSupply = partSupply;
      reservation.workOrder = workOrder;
      const query: FindStockReservationsQueryDto = {
        page: 1,
        limit: 10,
        workOrderId: workOrder.id,
      };
      const response = StockPresenter.toPaginatedStockReservationsResponse({
        items: [reservation],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });
      jest.spyOn(cleanController, 'getStockReservations').mockResolvedValue(response);

      const result = await httpController.getStockReservations(query);

      expect(result).toBe(response);
      expect(cleanController.getStockReservations).toHaveBeenCalledWith(query);
    });
  });
});
