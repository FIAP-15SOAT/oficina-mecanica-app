import { WorkOrder } from '@domain/entities/work-order.entity';
import { User } from '@domain/entities/user.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { UserRole } from '@domain/enums/user-role.enum';

describe('WorkOrder Entity', () => {
  const baseProps = {
    customerId: '550e8400-e29b-41d4-a716-446655440001',
    vehicleId: '550e8400-e29b-41d4-a716-446655440002',
    number: '000001',
  };

  describe('create()', () => {
    it('should create a work order with RECEIVED status and zero total', () => {
      const wo = WorkOrder.create(baseProps);

      expect(wo.id).toBeDefined();
      expect(wo.status).toBe(WorkOrderStatus.RECEIVED);
      expect(wo.totalAmount).toBe(0);
      expect(wo.number).toBe('000001');
      expect(wo.customerId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(wo.vehicleId).toBe('550e8400-e29b-41d4-a716-446655440002');
      expect(wo.approvedAt).toBeNull();
      expect(wo.startedAt).toBeNull();
      expect(wo.finishedAt).toBeNull();
      expect(wo.deliveredAt).toBeNull();
    });

    it('should throw DomainValidationException when customerId is empty', () => {
      expect(() => WorkOrder.create({ ...baseProps, customerId: '' })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw DomainValidationException when vehicleId is empty', () => {
      expect(() => WorkOrder.create({ ...baseProps, vehicleId: '' })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw DomainValidationException when mileage is negative', () => {
      expect(() => WorkOrder.create({ ...baseProps, mileageAtService: -1 })).toThrow(
        DomainValidationException,
      );
    });

    it('should accept zero mileage', () => {
      const wo = WorkOrder.create({ ...baseProps, mileageAtService: 0 });
      expect(wo.mileageAtService).toBe(0);
    });

    it('should throw DomainValidationException when customerId is not a valid UUID', () => {
      expect(() => WorkOrder.create({ ...baseProps, customerId: 'not-a-uuid' })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw DomainValidationException when vehicleId is not a valid UUID', () => {
      expect(() => WorkOrder.create({ ...baseProps, vehicleId: 'not-a-uuid' })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw DomainValidationException when problemDescription exceeds 2000 chars', () => {
      expect(() =>
        WorkOrder.create({ ...baseProps, problemDescription: 'A'.repeat(2001) }),
      ).toThrow(DomainValidationException);
    });

    it('should throw DomainValidationException when internalNotes exceed 2000 chars', () => {
      expect(() => WorkOrder.create({ ...baseProps, internalNotes: 'N'.repeat(2001) })).toThrow(
        DomainValidationException,
      );
    });
    it('should throw BusinessRuleViolationException when assigned user is not a mechanic', () => {
      const nonMechanic = { id: 'u1', name: 'John', role: UserRole.ADMIN, isActive: true };
      expect(() =>
        WorkOrder.create({ ...baseProps, assignedUser: nonMechanic as unknown as User }),
      ).toThrow(BusinessRuleViolationException);
    });

    it('should throw BusinessRuleViolationException when assigned user is inactive', () => {
      const inactiveMechanic = { id: 'u1', name: 'John', role: UserRole.MECHANIC, isActive: false };
      expect(() =>
        WorkOrder.create({ ...baseProps, assignedUser: inactiveMechanic as unknown as User }),
      ).toThrow(BusinessRuleViolationException);
    });

    it('should allow creating with mechanic', () => {
      const mechanic = { id: 'u1', name: 'John', role: UserRole.MECHANIC, isActive: true };
      const wo = WorkOrder.create({ ...baseProps, assignedUser: mechanic as unknown as User });
      expect(wo.assignedUserId).toBe(mechanic.id);
      expect(wo.assignedUser).toEqual(mechanic);
    });
  });

  describe('update()', () => {
    it('should update fields in RECEIVED status', () => {
      const wo = WorkOrder.create(baseProps);
      wo.update({ problemDescription: 'Barulho no motor', mileageAtService: 50000 });

      expect(wo.problemDescription).toBe('Barulho no motor');
      expect(wo.mileageAtService).toBe(50000);
    });

    it('should update fields in IN_DIAGNOSIS status', () => {
      const wo = WorkOrder.create(baseProps);
      wo.changeStatus(WorkOrderStatus.IN_DIAGNOSIS);
      wo.update({ internalNotes: 'Verificar correia' });

      expect(wo.internalNotes).toBe('Verificar correia');
    });

    it('should throw BusinessRuleViolationException when updating AWAITING_APPROVAL status', () => {
      const wo = WorkOrder.create(baseProps);
      wo.changeStatus(WorkOrderStatus.IN_DIAGNOSIS);
      // Simulate going to AWAITING_APPROVAL via internal update (bypass transitions)
      wo.status = WorkOrderStatus.AWAITING_APPROVAL;

      expect(() => wo.update({ problemDescription: 'test' })).toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should update updatedAt on change', () => {
      const wo = WorkOrder.create(baseProps);
      const before = wo.updatedAt;
      wo.update({ mileageAtService: 100 });
      expect(wo.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should update assignedUserId and assignedUser', () => {
      const wo = WorkOrder.create(baseProps);
      const mechanic = { id: 'u3', name: 'Joe', role: UserRole.MECHANIC, isActive: true };
      wo.update({ assignedUser: mechanic as unknown as User });
      expect(wo.assignedUserId).toBe(mechanic.id);
    });

    it('should throw BusinessRuleViolationException when updating with non-mechanic', () => {
      const wo = WorkOrder.create(baseProps);
      const nonMechanic = { id: 'u3', name: 'Joe', role: UserRole.ADMIN, isActive: true };
      expect(() => wo.update({ assignedUser: nonMechanic as unknown as User })).toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should throw BusinessRuleViolationException when updating with inactive mechanic', () => {
      const wo = WorkOrder.create(baseProps);
      const inactiveMechanic = { id: 'u3', name: 'Joe', role: UserRole.MECHANIC, isActive: false };
      expect(() => wo.update({ assignedUser: inactiveMechanic as unknown as User })).toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should throw DomainValidationException for invalid fields on update', () => {
      const wo = WorkOrder.create(baseProps);
      expect(() => wo.update({ mileageAtService: -100 })).toThrow(DomainValidationException);
    });
  });

  describe('changeStatus()', () => {
    it('should transition RECEIVED -> IN_DIAGNOSIS', () => {
      const wo = WorkOrder.create(baseProps);
      wo.changeStatus(WorkOrderStatus.IN_DIAGNOSIS);
      expect(wo.status).toBe(WorkOrderStatus.IN_DIAGNOSIS);
    });

    it('should transition RECEIVED -> CANCELLED with notes', () => {
      const wo = WorkOrder.create(baseProps);
      wo.changeStatus(WorkOrderStatus.CANCELLED, 'Cancelado pelo cliente');
      expect(wo.status).toBe(WorkOrderStatus.CANCELLED);
    });

    it('should transition IN_DIAGNOSIS -> CANCELLED with notes', () => {
      const wo = WorkOrder.create(baseProps);
      wo.changeStatus(WorkOrderStatus.IN_DIAGNOSIS);
      wo.changeStatus(WorkOrderStatus.CANCELLED, 'Cancelado na oficina');
      expect(wo.status).toBe(WorkOrderStatus.CANCELLED);
    });

    it('should transition AWAITING_APPROVAL -> CANCELLED with notes', () => {
      const wo = WorkOrder.create(baseProps);
      wo.changeStatus(WorkOrderStatus.IN_DIAGNOSIS);
      wo.changeStatus(WorkOrderStatus.AWAITING_APPROVAL);
      wo.changeStatus(WorkOrderStatus.CANCELLED, 'Cliente desistiu');
      expect(wo.status).toBe(WorkOrderStatus.CANCELLED);
    });

    it('should throw when transitioning to CANCELLED without notes', () => {
      const wo = WorkOrder.create(baseProps);
      expect(() => wo.changeStatus(WorkOrderStatus.CANCELLED)).toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should throw for disallowed transition RECEIVED -> COMPLETED', () => {
      const wo = WorkOrder.create(baseProps);
      expect(() => wo.changeStatus(WorkOrderStatus.COMPLETED)).toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should throw when transitioning from terminal status CANCELLED', () => {
      const wo = WorkOrder.create(baseProps);
      wo.changeStatus(WorkOrderStatus.CANCELLED, 'notes');

      expect(() => wo.changeStatus(WorkOrderStatus.IN_DIAGNOSIS)).toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should throw when transitioning from terminal status DELIVERED', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.COMPLETED;
      wo.changeStatus(WorkOrderStatus.DELIVERED);

      expect(() => wo.changeStatus(WorkOrderStatus.IN_DIAGNOSIS)).toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should throw when transitioning to same status', () => {
      const wo = WorkOrder.create(baseProps);
      expect(() => wo.changeStatus(WorkOrderStatus.RECEIVED)).toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should set rejectedAt when transitioning to REJECTED (updateTimestampsForStatus)', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.AWAITING_APPROVAL;
      wo.changeStatus(WorkOrderStatus.REJECTED);

      expect(wo.rejectedAt).toBeInstanceOf(Date);
    });

    it('should set approvedAt when transitioning to APPROVED (updateTimestampsForStatus)', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.AWAITING_APPROVAL;
      wo.changeStatus(WorkOrderStatus.APPROVED);

      expect(wo.approvedAt).toBeInstanceOf(Date);
    });

    it('should set startedAt when transitioning to IN_PROGRESS (updateTimestampsForStatus)', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.APPROVED;
      wo.changeStatus(WorkOrderStatus.IN_PROGRESS);

      expect(wo.startedAt).toBeInstanceOf(Date);
    });

    it('should set finishedAt when transitioning to COMPLETED (updateTimestampsForStatus)', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.IN_PROGRESS;
      wo.changeStatus(WorkOrderStatus.COMPLETED);

      expect(wo.finishedAt).toBeInstanceOf(Date);
    });

    it('should set deliveredAt when transitioning to DELIVERED (updateTimestampsForStatus)', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.COMPLETED;
      wo.changeStatus(WorkOrderStatus.DELIVERED);

      expect(wo.deliveredAt).toBeInstanceOf(Date);
    });

    it('REJECTED -> AWAITING_APPROVAL is allowed', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.AWAITING_APPROVAL;
      wo.changeStatus(WorkOrderStatus.REJECTED);
      wo.changeStatus(WorkOrderStatus.AWAITING_APPROVAL);

      expect(wo.status).toBe(WorkOrderStatus.AWAITING_APPROVAL);
    });

    it('REJECTED -> IN_DIAGNOSIS should throw', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.AWAITING_APPROVAL;
      wo.changeStatus(WorkOrderStatus.REJECTED);

      expect(() => wo.changeStatus(WorkOrderStatus.IN_DIAGNOSIS)).toThrow(
        BusinessRuleViolationException,
      );
    });
  });

  describe('canCreateQuote()', () => {
    it('should return true for IN_DIAGNOSIS status', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.IN_DIAGNOSIS;
      expect(wo.canCreateQuote()).toBe(true);
    });

    it('should return true for AWAITING_APPROVAL status', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.AWAITING_APPROVAL;
      expect(wo.canCreateQuote()).toBe(true);
    });

    it('should return true for REJECTED status', () => {
      const wo = WorkOrder.create(baseProps);
      wo.status = WorkOrderStatus.REJECTED;
      expect(wo.canCreateQuote()).toBe(true);
    });

    it('should return false for RECEIVED status', () => {
      const wo = WorkOrder.create(baseProps);
      expect(wo.canCreateQuote()).toBe(false);
    });
  });
});
