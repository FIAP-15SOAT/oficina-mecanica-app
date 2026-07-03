import { randomUUID } from 'node:crypto';

import { WorkOrderPresenter } from '@interface-adapters/work-order/work-order.presenter';

import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { Plate } from '@domain/value-objects/plate.vo';
import { WorkOrderNumber } from '@domain/value-objects/work-order-number.vo';

import { createMockService } from '../../../helpers/service-mock.factory';
import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';
import { createMockCustomer } from '../../../helpers/customer-mock.factory';
import { createMockVehicle } from '../../../helpers/vehicle-mock.factory';
import { createMockUser } from '../../../helpers/user-mock.factory';
import { createMockStatusHistory } from '../../../helpers/status-history-mock.factory';

describe('WorkOrderPresenter', () => {
  describe('toResponse', () => {
    it('should format a work order correctly', () => {
      const now = new Date();
      const customer = createMockCustomer();
      const vehicle = createMockVehicle({ customerId: customer.id });

      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        number: WorkOrderNumber.create('000001'),
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: null,
        status: WorkOrderStatus.IN_DIAGNOSIS,
        problemDescription: 'Some problem',
        internalNotes: 'Some notes',
        mileageAtService: 50000,
        totalAmount: 250.0,
        version: 0,
        approvedAt: now,
        rejectedAt: null,
        startedAt: now,
        finishedAt: null,
        deliveredAt: null,
        createdAt: now,
        updatedAt: now,
      });
      workOrder.customer = customer;
      workOrder.vehicle = vehicle;

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.id).toBe(workOrder.id);
      expect(response.number).toBe(workOrder.number.toString());
      expect(response.customer.id).toBe(customer.id);
      expect(response.vehicle.id).toBe(vehicle.id);
      expect(response.assignedUser).toBeNull();
      expect(response.status).toBe(workOrder.status);
      expect(response.totalAmount).toBe(workOrder.totalAmount);
    });

    it('should format a work order with nested relations correctly', () => {
      const customer = createMockCustomer({ name: 'Customer' });
      const vehicle = createMockVehicle({ plate: Plate.create('ABC-1234') });
      const user = createMockUser({ name: 'User' });

      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        customerId: customer.id,
        vehicleId: vehicle.id,
        number: WorkOrderNumber.create('000001'),
        assignedUserId: user.id,
        status: WorkOrderStatus.RECEIVED,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      workOrder.customer = customer;
      workOrder.vehicle = vehicle;
      workOrder.assignedUser = user;

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.customer.name).toBe('Customer');
      expect(response.vehicle.plate).toBe('ABC1234');
      expect(response.assignedUser!.name).toBe('User');
    });
  });

  describe('toDataResponse', () => {
    it('should wrap response in data property', () => {
      const customer = createMockCustomer();
      const vehicle = createMockVehicle({ customerId: customer.id });
      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        number: WorkOrderNumber.create('001'),
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: null,
        status: WorkOrderStatus.RECEIVED,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      workOrder.customer = customer;
      workOrder.vehicle = vehicle;
      const result = WorkOrderPresenter.toDataResponse(workOrder);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(workOrder.id);
    });
  });

  describe('toPaginatedResponse', () => {
    it('should format paginated results', () => {
      const customer = createMockCustomer();
      const vehicle = createMockVehicle({ customerId: customer.id });
      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        number: WorkOrderNumber.create('001'),
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: null,
        status: WorkOrderStatus.RECEIVED,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      workOrder.customer = customer;
      workOrder.vehicle = vehicle;
      const paginatedResult = {
        items: [workOrder],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      };

      const response = WorkOrderPresenter.toPaginatedResponse(paginatedResult);

      expect(response.data).toHaveLength(1);
      expect(response.pagination).toEqual(paginatedResult.pagination);
      expect(response.data[0].services).toBeUndefined();
      expect(response.data[0].partSupplies).toBeUndefined();
    });
  });

  describe('toSummaryResponse', () => {
    it('should format work order without services or partSupplies', () => {
      const customer = createMockCustomer();
      const vehicle = createMockVehicle({ customerId: customer.id });
      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        number: WorkOrderNumber.create('001'),
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: null,
        status: WorkOrderStatus.RECEIVED,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      workOrder.customer = customer;
      workOrder.vehicle = vehicle;

      const response = WorkOrderPresenter.toSummaryResponse(workOrder);

      expect(response.id).toBe(workOrder.id);
      expect(response.services).toBeUndefined();
      expect(response.partSupplies).toBeUndefined();
    });
  });

  describe('toResponse with services and partSupplies', () => {
    it('should include services with nested service entity data', () => {
      const now = new Date();
      const customer = createMockCustomer();
      const vehicle = createMockVehicle({ customerId: customer.id });
      const service = createMockService();

      const wos = WorkOrderService.reconstitute({
        workOrderId: randomUUID(),
        serviceId: service.id,
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        status: WorkOrderServiceStatus.PENDING,
        startedAt: null,
        finishedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      wos.service = service;

      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        number: WorkOrderNumber.create('002'),
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: null,
        status: WorkOrderStatus.RECEIVED,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: now,
        updatedAt: now,
        services: [wos],
      });
      workOrder.customer = customer;
      workOrder.vehicle = vehicle;

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.services).toHaveLength(1);
      expect(response.services![0].id).toBe(service.id);
      expect(response.services![0].name).toBe(service.name);
      expect(response.services![0].description).toBe(service.description);
    });

    it('should include partSupplies with nested partSupply entity data', () => {
      const now = new Date();
      const customer = createMockCustomer();
      const vehicle = createMockVehicle({ customerId: customer.id });
      const partSupply = createMockPartSupply();

      const wop = WorkOrderPartSupply.reconstitute({
        workOrderId: randomUUID(),
        partSupplyId: partSupply.id,
        quantity: 3,
        unitPrice: 25,
        totalPrice: 75,
        createdAt: now,
        updatedAt: now,
      });
      wop.partSupply = partSupply;

      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        number: WorkOrderNumber.create('004'),
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: null,
        status: WorkOrderStatus.RECEIVED,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: now,
        updatedAt: now,
        partSupplies: [wop],
      });
      workOrder.customer = customer;
      workOrder.vehicle = vehicle;

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.partSupplies).toHaveLength(1);
      expect(response.partSupplies![0].id).toBe(partSupply.id);
      expect(response.partSupplies![0].name).toBe(partSupply.name);
      expect(response.partSupplies![0].sku).toBe(partSupply.sku);
    });

    it('should use null for partNumber when partSupply has no partNumber', () => {
      const now = new Date();
      const customer = createMockCustomer();
      const vehicle = createMockVehicle({ customerId: customer.id });
      const partSupply = createMockPartSupply({ partNumber: undefined });

      const wop = WorkOrderPartSupply.reconstitute({
        workOrderId: randomUUID(),
        partSupplyId: partSupply.id,
        quantity: 1,
        unitPrice: 10,
        totalPrice: 10,
        createdAt: now,
        updatedAt: now,
      });
      wop.partSupply = partSupply;

      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        number: WorkOrderNumber.create('005'),
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: null,
        status: WorkOrderStatus.RECEIVED,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: now,
        updatedAt: now,
        partSupplies: [wop],
      });
      workOrder.customer = customer;
      workOrder.vehicle = vehicle;

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.partSupplies![0].partNumber).toBeNull();
    });
  });

  describe('toStatusHistoryListResponse', () => {
    it('should return empty data array when history is empty', () => {
      const result = WorkOrderPresenter.toStatusHistoryListResponse([]);

      expect(result.data).toEqual([]);
    });

    it('should map all fields of a status history entry with no changedBy', () => {
      const now = new Date();

      const entry = createMockStatusHistory({
        previousStatus: WorkOrderStatus.RECEIVED,
        newStatus: WorkOrderStatus.IN_DIAGNOSIS,
        notes: 'Diagnóstico iniciado',
        createdAt: now,
      });

      const result = WorkOrderPresenter.toStatusHistoryListResponse([entry]);

      expect(result.data).toHaveLength(1);

      const item = result.data[0];

      expect(item.id).toBe(entry.id);
      expect(item.previousStatus).toBe(WorkOrderStatus.RECEIVED);
      expect(item.newStatus).toBe(WorkOrderStatus.IN_DIAGNOSIS);
      expect(item.notes).toBe('Diagnóstico iniciado');
      expect(item.createdAt).toBe(now);
      expect(item.changedBy).toBeNull();
    });

    it('should map changedBy user fields when user is set', () => {
      const user = createMockUser({ name: 'Mecânico' });
      const entry = createMockStatusHistory({ previousStatus: null });
      entry.changedBy = user;

      const result = WorkOrderPresenter.toStatusHistoryListResponse([entry]);

      const changedBy = result.data[0].changedBy!;

      expect(changedBy).not.toBeNull();
      expect(changedBy.id).toBe(user.id);
      expect(changedBy.name).toBe('Mecânico');
      expect(changedBy.email).toBe(user.email.value);
      expect(changedBy.role).toBe(user.role);
    });

    it('should map multiple entries preserving order', () => {
      const entry1 = createMockStatusHistory({ newStatus: WorkOrderStatus.IN_DIAGNOSIS });

      const entry2 = createMockStatusHistory({ newStatus: WorkOrderStatus.APPROVED });

      const result = WorkOrderPresenter.toStatusHistoryListResponse([entry1, entry2]);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].newStatus).toBe(WorkOrderStatus.IN_DIAGNOSIS);
      expect(result.data[1].newStatus).toBe(WorkOrderStatus.APPROVED);
    });
  });
});
