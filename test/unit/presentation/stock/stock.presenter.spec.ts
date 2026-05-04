import { StockPresenter } from '@presentation/stock/stock.presenter';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';
import { createMockWorkOrder } from '../../../helpers/work-order-mock.factory';
import { createMockCustomer } from '../../../helpers/customer-mock.factory';
import { createMockVehicle } from '../../../helpers/vehicle-mock.factory';
import { createMockUser } from '../../../helpers/user-mock.factory';
import { randomUUID } from 'node:crypto';

describe('StockPresenter', () => {
  const now = new Date();

  describe('toPaginatedStockMovementsResponse', () => {
    it('should format a stock movement without relations (fallback to id only)', () => {
      const movement = new StockMovement({
        id: randomUUID(),
        partSupplyId: randomUUID(),
        workOrderId: null,
        type: StockMovementType.ENTRY,
        quantity: 5,
        reason: 'Restock',
        createdAt: now,
      });

      const result = StockPresenter.toPaginatedStockMovementsResponse({
        items: [movement],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].partSupply.id).toBe(movement.partSupplyId);
      expect(result.data[0].workOrder).toBeNull();
      expect(result.pagination.totalRecords).toBe(1);
    });

    it('should format a stock movement with partSupply and workOrder relations', () => {
      const customer = createMockCustomer();
      const vehicle = createMockVehicle({ customerId: customer.id, customer });
      const assignedUser = createMockUser();
      const workOrder = createMockWorkOrder({ customer, vehicle, assignedUser });
      const partSupply = createMockPartSupply();

      const movement = new StockMovement({
        id: randomUUID(),
        partSupplyId: partSupply.id,
        workOrderId: workOrder.id,
        type: StockMovementType.EXIT,
        quantity: 2,
        reason: 'Used in repair',
        createdAt: now,
      });
      movement.partSupply = partSupply;
      movement.workOrder = workOrder;

      const result = StockPresenter.toPaginatedStockMovementsResponse({
        items: [movement],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      const item = result.data[0];
      expect(item.partSupply.id).toBe(partSupply.id);
      expect(item.partSupply.name).toBe(partSupply.name);
      expect(item.partSupply.sku).toBe(partSupply.sku);
      expect(item.workOrder).toBeDefined();
      expect(item.workOrder!.id).toBe(workOrder.id);
      expect(item.workOrder!.customer!.id).toBe(customer.id);
      expect(item.workOrder!.vehicle!.id).toBe(vehicle.id);
      expect(item.workOrder!.assignedUser!.id).toBe(assignedUser.id);
    });

    it('should format a stock movement with workOrder but without nested customer/vehicle/assignedUser', () => {
      const workOrder = createMockWorkOrder();
      const partSupply = createMockPartSupply();

      const movement = new StockMovement({
        id: randomUUID(),
        partSupplyId: partSupply.id,
        workOrderId: workOrder.id,
        type: StockMovementType.EXIT,
        quantity: 1,
        reason: null,
        createdAt: now,
      });
      movement.partSupply = partSupply;
      movement.workOrder = workOrder;

      const result = StockPresenter.toPaginatedStockMovementsResponse({
        items: [movement],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      const item = result.data[0];
      expect(item.workOrder!.customer).toBeNull();
      expect(item.workOrder!.vehicle).toBeNull();
      expect(item.workOrder!.assignedUser).toBeNull();
    });

    it('should format partNumber as null when partSupply has no partNumber', () => {
      const partSupply = createMockPartSupply({ partNumber: undefined });

      const movement = new StockMovement({
        id: randomUUID(),
        partSupplyId: partSupply.id,
        workOrderId: null,
        type: StockMovementType.ENTRY,
        quantity: 1,
        reason: null,
        createdAt: now,
      });
      movement.partSupply = partSupply;

      const result = StockPresenter.toPaginatedStockMovementsResponse({
        items: [movement],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      expect(result.data[0].partSupply.partNumber).toBeNull();
    });
  });

  describe('toPaginatedStockReservationsResponse', () => {
    it('should format a stock reservation without relations (fallback to id only)', () => {
      const reservation = new StockReservation({
        id: randomUUID(),
        partSupplyId: randomUUID(),
        workOrderId: randomUUID(),
        quantity: 3,
        createdAt: now,
      });

      const result = StockPresenter.toPaginatedStockReservationsResponse({
        items: [reservation],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].partSupply.id).toBe(reservation.partSupplyId);
      expect(result.data[0].workOrder.id).toBe(reservation.workOrderId);
    });

    it('should format a stock reservation with partSupply and workOrder relations', () => {
      const customer = createMockCustomer();
      const vehicle = createMockVehicle({ customerId: customer.id, customer });
      const assignedUser = createMockUser();
      const workOrder = createMockWorkOrder({ customer, vehicle, assignedUser });
      const partSupply = createMockPartSupply();

      const reservation = new StockReservation({
        id: randomUUID(),
        partSupplyId: partSupply.id,
        workOrderId: workOrder.id,
        quantity: 4,
        createdAt: now,
      });
      reservation.partSupply = partSupply;
      reservation.workOrder = workOrder;

      const result = StockPresenter.toPaginatedStockReservationsResponse({
        items: [reservation],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      const item = result.data[0];
      expect(item.partSupply.id).toBe(partSupply.id);
      expect(item.partSupply.name).toBe(partSupply.name);
      expect(item.workOrder.id).toBe(workOrder.id);
      expect(item.workOrder.customer!.id).toBe(customer.id);
      expect(item.workOrder.vehicle!.id).toBe(vehicle.id);
      expect(item.workOrder.assignedUser!.id).toBe(assignedUser.id);
    });

    it('should format a stock reservation with workOrder but without nested customer/vehicle/assignedUser', () => {
      const workOrder = createMockWorkOrder();
      const partSupply = createMockPartSupply();

      const reservation = new StockReservation({
        id: randomUUID(),
        partSupplyId: partSupply.id,
        workOrderId: workOrder.id,
        quantity: 2,
        createdAt: now,
      });
      reservation.partSupply = partSupply;
      reservation.workOrder = workOrder;

      const result = StockPresenter.toPaginatedStockReservationsResponse({
        items: [reservation],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      const item = result.data[0];
      expect(item.workOrder.customer).toBeNull();
      expect(item.workOrder.vehicle).toBeNull();
      expect(item.workOrder.assignedUser).toBeNull();
    });

    it('should format partNumber as null when partSupply has no partNumber', () => {
      const partSupply = createMockPartSupply({ partNumber: undefined });
      const workOrder = createMockWorkOrder();

      const reservation = new StockReservation({
        id: randomUUID(),
        partSupplyId: partSupply.id,
        workOrderId: workOrder.id,
        quantity: 1,
        createdAt: now,
      });
      reservation.partSupply = partSupply;
      reservation.workOrder = workOrder;

      const result = StockPresenter.toPaginatedStockReservationsResponse({
        items: [reservation],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      expect(result.data[0].partSupply.partNumber).toBeNull();
    });
  });
});
