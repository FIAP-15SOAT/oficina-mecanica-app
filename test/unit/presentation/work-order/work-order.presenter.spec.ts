import { WorkOrderPresenter } from '@presentation/work-order/work-order.presenter';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { createMockService } from '../../../helpers/service-mock.factory';
import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';
import { randomUUID } from 'node:crypto';

describe('WorkOrderPresenter', () => {
  describe('toResponse', () => {
    it('should format a work order correctly', () => {
      const now = new Date();
      const workOrder = new WorkOrder({
        id: randomUUID(),
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: randomUUID(),
        status: WorkOrderStatus.IN_DIAGNOSIS,
        problemDescription: 'Some problem',
        internalNotes: 'Some notes',
        mileageAtService: 50000,
        totalAmount: 250.0,
        approvedAt: now,
        rejectedAt: null,
        startedAt: now,
        finishedAt: null,
        deliveredAt: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.id).toBe(workOrder.id);
      expect(response.number).toBe(workOrder.number);
      expect(response.customer).toEqual({ id: workOrder.customerId });
      expect(response.vehicle).toEqual({ id: workOrder.vehicleId });
      expect(response.assignedUser).toBeNull();
      expect(response.status).toBe(workOrder.status);
      expect(response.totalAmount).toBe(workOrder.totalAmount);
    });

    it('should format a work order with nested relations correctly', () => {
      const workOrder = new WorkOrder({
        id: randomUUID(),
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        customer: { id: randomUUID(), name: 'Customer' } as unknown as WorkOrder['customer'],
        vehicle: { id: randomUUID(), plate: 'ABC-1234' } as unknown as WorkOrder['vehicle'],
        assignedUser: { id: randomUUID(), name: 'User' } as unknown as WorkOrder['assignedUser'],
      });

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.customer.name).toBe('Customer');
      expect(response.vehicle.plate).toBe('ABC-1234');
      expect(response.assignedUser!.name).toBe('User');
    });
  });

  describe('toDataResponse', () => {
    it('should wrap response in data property', () => {
      const workOrder = new WorkOrder({ id: randomUUID(), number: '001' });
      const result = WorkOrderPresenter.toDataResponse(workOrder);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(workOrder.id);
    });
  });

  describe('toPaginatedResponse', () => {
    it('should format paginated results', () => {
      const workOrder = new WorkOrder({ id: randomUUID(), number: '001' });
      const paginatedResult = {
        items: [workOrder],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      };

      const response = WorkOrderPresenter.toPaginatedResponse(paginatedResult);

      expect(response.data).toHaveLength(1);
      expect(response.pagination).toEqual(paginatedResult.pagination);
    });
  });

  describe('toResponse with services and partSupplies', () => {
    it('should include services with nested service entity data', () => {
      const now = new Date();
      const service = createMockService();
      const wos = new WorkOrderService({
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

      const workOrder = new WorkOrder({
        id: randomUUID(),
        number: '002',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        services: [wos],
      });

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.services).toHaveLength(1);
      expect(response.services![0].id).toBe(service.id);
      expect(response.services![0].name).toBe(service.name);
      expect(response.services![0].description).toBe(service.description);
    });

    it('should include services with fallback when service relation is absent', () => {
      const now = new Date();
      const serviceId = randomUUID();
      const wos = new WorkOrderService({
        workOrderId: randomUUID(),
        serviceId,
        quantity: 1,
        unitPrice: 50,
        totalPrice: 50,
        status: WorkOrderServiceStatus.PENDING,
        startedAt: null,
        finishedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      const workOrder = new WorkOrder({
        id: randomUUID(),
        number: '003',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        services: [wos],
      });

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.services![0].id).toBe(serviceId);
      expect(response.services![0].name).toBe('');
      expect(response.services![0].description).toBeNull();
    });

    it('should include partSupplies with nested partSupply entity data', () => {
      const now = new Date();
      const partSupply = createMockPartSupply();
      const wop = new WorkOrderPartSupply({
        workOrderId: randomUUID(),
        partSupplyId: partSupply.id,
        quantity: 3,
        unitPrice: 25,
        totalPrice: 75,
        createdAt: now,
        updatedAt: now,
      });
      wop.partSupply = partSupply;

      const workOrder = new WorkOrder({
        id: randomUUID(),
        number: '004',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        partSupplies: [wop],
      });

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.partSupplies).toHaveLength(1);
      expect(response.partSupplies![0].id).toBe(partSupply.id);
      expect(response.partSupplies![0].name).toBe(partSupply.name);
      expect(response.partSupplies![0].sku).toBe(partSupply.sku);
    });

    it('should use null for partNumber when partSupply has no partNumber', () => {
      const now = new Date();
      const partSupply = createMockPartSupply({ partNumber: undefined });
      const wop = new WorkOrderPartSupply({
        workOrderId: randomUUID(),
        partSupplyId: partSupply.id,
        quantity: 1,
        unitPrice: 10,
        totalPrice: 10,
        createdAt: now,
        updatedAt: now,
      });
      wop.partSupply = partSupply;

      const workOrder = new WorkOrder({
        id: randomUUID(),
        number: '005',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        partSupplies: [wop],
      });

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.partSupplies![0].partNumber).toBeNull();
    });
  });
});
