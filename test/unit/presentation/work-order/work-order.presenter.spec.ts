import { WorkOrderPresenter } from '@presentation/work-order/work-order.presenter';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { randomUUID } from 'crypto';

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
        customer: { id: randomUUID(), name: 'Customer' } as any,
        vehicle: { id: randomUUID(), plate: 'ABC-1234' } as any,
        assignedUser: { id: randomUUID(), name: 'User' } as any,
      });

      const response = WorkOrderPresenter.toResponse(workOrder);

      expect(response.customer!.name).toBe('Customer');
      expect(response.vehicle!.plate).toBe('ABC-1234');
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

      const response = WorkOrderPresenter.toPaginatedResponse(paginatedResult as any);

      expect(response.data).toHaveLength(1);
      expect(response.pagination).toEqual(paginatedResult.pagination);
    });
  });
});
