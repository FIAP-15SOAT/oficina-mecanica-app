import { WorkOrderService } from '../../../../src/domain/entities/work-order-service.entity';
import { WorkOrderServiceStatus } from '../../../../src/domain/enums';

describe('WorkOrderService Entity', () => {
  const validProps = {
    id: 'wos-uuid-123',
    workOrderId: 'wo-uuid-456',
    serviceId: 'service-uuid-789',
    quantity: 2,
    unitPrice: 150.0,
    totalPrice: 300.0,
    status: WorkOrderServiceStatus.PENDING,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  describe('constructor', () => {
    it('deve criar um WorkOrderService com todos os campos', () => {
      const wos = new WorkOrderService(validProps);

      expect(wos.id).toBe(validProps.id);
      expect(wos.workOrderId).toBe(validProps.workOrderId);
      expect(wos.serviceId).toBe(validProps.serviceId);
      expect(wos.quantity).toBe(validProps.quantity);
      expect(wos.unitPrice).toBe(validProps.unitPrice);
      expect(wos.totalPrice).toBe(validProps.totalPrice);
      expect(wos.status).toBe(WorkOrderServiceStatus.PENDING);
      expect(wos.startedAt).toBeNull();
      expect(wos.finishedAt).toBeNull();
      expect(wos.createdAt).toBe(validProps.createdAt);
      expect(wos.updatedAt).toBe(validProps.updatedAt);
      expect(wos).not.toHaveProperty('timeSpentMin');
    });

    it('deve criar um WorkOrderService com startedAt e finishedAt preenchidos', () => {
      const startedAt = new Date('2024-01-01T11:00:00Z');
      const finishedAt = new Date('2024-01-01T12:00:00Z');

      const wos = new WorkOrderService({
        ...validProps,
        status: WorkOrderServiceStatus.COMPLETED,
        startedAt,
        finishedAt,
      });

      expect(wos.status).toBe(WorkOrderServiceStatus.COMPLETED);
      expect(wos.startedAt).toBe(startedAt);
      expect(wos.finishedAt).toBe(finishedAt);
    });

    it('deve criar um WorkOrderService com status IN_PROGRESS', () => {
      const startedAt = new Date('2024-01-01T11:00:00Z');

      const wos = new WorkOrderService({
        ...validProps,
        status: WorkOrderServiceStatus.IN_PROGRESS,
        startedAt,
      });

      expect(wos.status).toBe(WorkOrderServiceStatus.IN_PROGRESS);
      expect(wos.startedAt).toBe(startedAt);
      expect(wos.finishedAt).toBeNull();
    });

    it('deve criar um WorkOrderService com campos parciais', () => {
      const wos = new WorkOrderService({ quantity: 1, unitPrice: 50.0 });

      expect(wos.quantity).toBe(1);
      expect(wos.unitPrice).toBe(50.0);
      expect(wos.id).toBeUndefined();
      expect(wos.status).toBeUndefined();
    });

    it('deve criar um WorkOrderService vazio sem erros', () => {
      expect(() => new WorkOrderService({})).not.toThrow();
    });
  });
});
