import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('StatusHistory Entity', () => {
  const validWorkOrderId = '123e4567-e89b-12d3-a456-426614174000';
  const validChangedById = '223e4567-e89b-12d3-a456-426614174001';

  describe('create()', () => {
    it('should create a valid StatusHistory', () => {
      const entity = StatusHistory.create({
        workOrderId: validWorkOrderId,
        changedById: validChangedById,
        previousStatus: WorkOrderStatus.RECEIVED,
        newStatus: WorkOrderStatus.IN_DIAGNOSIS,
        notes: 'Diagnóstico iniciado',
      });

      expect(entity).toBeInstanceOf(StatusHistory);
      expect(entity.workOrderId).toBe(validWorkOrderId);
      expect(entity.changedById).toBe(validChangedById);
      expect(entity.previousStatus).toBe(WorkOrderStatus.RECEIVED);
      expect(entity.newStatus).toBe(WorkOrderStatus.IN_DIAGNOSIS);
      expect(entity.notes).toBe('Diagnóstico iniciado');
      expect(entity.id).toBeDefined();
      expect(entity.createdAt).toBeInstanceOf(Date);
    });

    it('should create with changedById as null', () => {
      const entity = StatusHistory.create({
        workOrderId: validWorkOrderId,
        changedById: null,
        newStatus: WorkOrderStatus.IN_DIAGNOSIS,
      });

      expect(entity.changedById).toBeNull();
    });

    it('should create with notes as null', () => {
      const entity = StatusHistory.create({
        workOrderId: validWorkOrderId,
        newStatus: WorkOrderStatus.IN_DIAGNOSIS,
        notes: null,
      });

      expect(entity.notes).toBeNull();
    });

    it('should throw when workOrderId is empty', () => {
      expect(() =>
        StatusHistory.create({
          workOrderId: '',
          newStatus: WorkOrderStatus.IN_DIAGNOSIS,
        }),
      ).toThrow(DomainValidationException);
    });

    it('should throw when workOrderId is not a valid UUID', () => {
      expect(() =>
        StatusHistory.create({
          workOrderId: 'not-a-uuid',
          newStatus: WorkOrderStatus.IN_DIAGNOSIS,
        }),
      ).toThrow(DomainValidationException);
    });

    it('should throw when changedById is not a valid UUID', () => {
      expect(() =>
        StatusHistory.create({
          workOrderId: validWorkOrderId,
          changedById: 'invalid-uuid',
          newStatus: WorkOrderStatus.IN_DIAGNOSIS,
        }),
      ).toThrow(DomainValidationException);
    });

    it('should throw when notes exceed max length', () => {
      expect(() =>
        StatusHistory.create({
          workOrderId: validWorkOrderId,
          newStatus: WorkOrderStatus.IN_DIAGNOSIS,
          notes: 'A'.repeat(2001),
        }),
      ).toThrow(DomainValidationException);
    });

    it('should not throw when notes are exactly at max length', () => {
      expect(() =>
        StatusHistory.create({
          workOrderId: validWorkOrderId,
          newStatus: WorkOrderStatus.IN_DIAGNOSIS,
          notes: 'A'.repeat(2000),
        }),
      ).not.toThrow();
    });

    it('should throw when newStatus is not provided', () => {
      expect(() =>
        StatusHistory.create({
          workOrderId: validWorkOrderId,
          newStatus: undefined as unknown as WorkOrderStatus,
        }),
      ).toThrow(DomainValidationException);
    });
  });
});
