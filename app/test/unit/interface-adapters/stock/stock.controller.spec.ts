import { randomUUID } from 'node:crypto';

import { StockController } from '@interface-adapters/stock/stock.controller';
import { StockPresenter } from '@interface-adapters/stock/stock.presenter';

import { IFindStockMovementsUseCase } from '@application/ports/input/stock/find-stock-movements.use-case.interface';
import { IFindStockReservationsUseCase } from '@application/ports/input/stock/find-stock-reservations.use-case.interface';

import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';

import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';
import { createMockCustomer } from '../../../helpers/customer-mock.factory';
import { createMockVehicle } from '../../../helpers/vehicle-mock.factory';
import { createMockWorkOrder } from '../../../helpers/work-order-mock.factory';

describe('StockController', () => {
  let controller: StockController;
  let findMovementsUseCase: jest.Mocked<IFindStockMovementsUseCase>;
  let findReservationsUseCase: jest.Mocked<IFindStockReservationsUseCase>;

  const customer = createMockCustomer();
  const vehicle = createMockVehicle({ customerId: customer.id });
  const workOrder = createMockWorkOrder({ customer, vehicle });
  const partSupply = createMockPartSupply();

  beforeEach(() => {
    findMovementsUseCase = { execute: jest.fn() };
    findReservationsUseCase = { execute: jest.fn() };
    controller = new StockController(findMovementsUseCase, findReservationsUseCase);
  });

  describe('getStockMovements', () => {
    it('should default page and limit when missing and forward filters', async () => {
      const movement = StockMovement.reconstitute({
        id: randomUUID(),
        partSupplyId: partSupply.id,
        workOrderId: null,
        type: StockMovementType.ENTRY,
        quantity: 5,
        reason: 'Restock',
        createdAt: new Date(),
      });
      movement.partSupply = partSupply;
      findMovementsUseCase.execute.mockResolvedValue({
        items: [movement],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      const result = await controller.getStockMovements({ partSupplyId: partSupply.id });

      expect(result).toEqual(
        StockPresenter.toPaginatedStockMovementsResponse({
          items: [movement],
          pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
        }),
      );
      expect(findMovementsUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        partSupplyId: partSupply.id,
      });
    });

    it('should forward provided page, limit and date range', async () => {
      findMovementsUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 2, limit: 5 },
      });

      await controller.getStockMovements({
        page: 2,
        limit: 5,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(findMovementsUseCase.execute).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
    });
  });

  describe('getStockReservations', () => {
    it('should default page and limit when missing and forward filters', async () => {
      const reservation = StockReservation.reconstitute({
        id: randomUUID(),
        partSupplyId: partSupply.id,
        workOrderId: workOrder.id,
        quantity: 3,
        createdAt: new Date(),
      });
      reservation.partSupply = partSupply;
      reservation.workOrder = workOrder;
      findReservationsUseCase.execute.mockResolvedValue({
        items: [reservation],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      const result = await controller.getStockReservations({ workOrderId: workOrder.id });

      expect(result).toEqual(
        StockPresenter.toPaginatedStockReservationsResponse({
          items: [reservation],
          pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
        }),
      );
      expect(findReservationsUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        workOrderId: workOrder.id,
      });
    });

    it('should forward provided page and limit', async () => {
      findReservationsUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 2, limit: 5 },
      });

      await controller.getStockReservations({ page: 2, limit: 5 });

      expect(findReservationsUseCase.execute).toHaveBeenCalledWith({ page: 2, limit: 5 });
    });
  });
});
