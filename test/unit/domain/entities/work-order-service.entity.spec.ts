import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { randomUUID } from 'node:crypto';

describe('WorkOrderService Entity', () => {
  const validProps = {
    workOrderId: randomUUID(),
    serviceId: randomUUID(),
    quantity: 2,
    unitPrice: 150.0,
  };

  describe('create()', () => {
    it('should create a WorkOrderService with valid props', () => {
      const wos = WorkOrderService.create(validProps);

      expect(wos.id).toBeDefined();
      expect(wos.workOrderId).toBe(validProps.workOrderId);
      expect(wos.serviceId).toBe(validProps.serviceId);
      expect(wos.quantity).toBe(validProps.quantity);
      expect(wos.unitPrice).toBe(validProps.unitPrice);
      expect(wos.totalPrice).toBe(300.0);
      expect(wos.status).toBe(WorkOrderServiceStatus.PENDING);
      expect(wos.startedAt).toBeNull();
      expect(wos.finishedAt).toBeNull();
      expect(wos.createdAt).toBeInstanceOf(Date);
      expect(wos.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw if workOrderId is missing', () => {
      expect(() =>
        WorkOrderService.create({ ...validProps, workOrderId: undefined as unknown as string }),
      ).toThrow(DomainValidationException);
    });

    it('should throw if workOrderId is not a valid UUID', () => {
      expect(() => WorkOrderService.create({ ...validProps, workOrderId: 'invalid-uuid' })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw if serviceId is missing', () => {
      expect(() =>
        WorkOrderService.create({ ...validProps, serviceId: undefined as unknown as string }),
      ).toThrow(DomainValidationException);
    });

    it('should throw if serviceId is not a valid UUID', () => {
      expect(() => WorkOrderService.create({ ...validProps, serviceId: 'invalid-uuid' })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw if quantity is not an integer', () => {
      expect(() => WorkOrderService.create({ ...validProps, quantity: 1.5 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw if quantity is less than 1', () => {
      expect(() => WorkOrderService.create({ ...validProps, quantity: 0 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw if unitPrice is negative', () => {
      expect(() => WorkOrderService.create({ ...validProps, unitPrice: -10 })).toThrow(
        DomainValidationException,
      );
    });

    it('should not throw if unitPrice is zero', () => {
      expect(() => WorkOrderService.create({ ...validProps, unitPrice: 0 })).not.toThrow();
    });
  });

  describe('startService()', () => {
    it('should set status to IN_PROGRESS and set startedAt', () => {
      const wos = WorkOrderService.create(validProps);
      wos.startService();

      expect(wos.status).toBe(WorkOrderServiceStatus.IN_PROGRESS);
      expect(wos.startedAt).toBeInstanceOf(Date);
      expect(wos.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw BusinessRuleViolationException when already IN_PROGRESS', () => {
      const wos = WorkOrderService.create(validProps);
      wos.startService();

      expect(() => wos.startService()).toThrow(BusinessRuleViolationException);
    });
  });

  describe('completeService()', () => {
    it('should set status to COMPLETED and set finishedAt', () => {
      const wos = WorkOrderService.create(validProps);
      wos.startService(); // In progress first
      wos.completeService();

      expect(wos.status).toBe(WorkOrderServiceStatus.COMPLETED);
      expect(wos.finishedAt).toBeInstanceOf(Date);
      expect(wos.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw BusinessRuleViolationException when already COMPLETED', () => {
      const wos = WorkOrderService.create(validProps);
      wos.startService();
      wos.completeService();

      expect(() => wos.completeService()).toThrow(BusinessRuleViolationException);
    });
  });
});
