import { WorkOrder } from '@domain/entities/work-order.entity';
import { User } from '@domain/entities/user.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { EntityNotFoundException } from '@domain/exceptions/entity-not-found.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { UserRole } from '@domain/enums/user-role.enum';
import { createMockWorkOrderService } from '../../../helpers/work-order-service-mock.factory';
import {
  createMockQuote,
  createMockQuoteService,
  createMockQuotePartSupply,
} from '../../../helpers/quote-mock.factory';
import { createMockWorkOrder } from '../../../helpers/work-order-mock.factory';
import { randomUUID } from 'node:crypto';

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
      const wo = createMockWorkOrder({ status: WorkOrderStatus.AWAITING_APPROVAL });

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

    it('should clear assignedUser when null is passed', () => {
      const mechanic = { id: 'u4', name: 'Joe', role: UserRole.MECHANIC, isActive: true };
      const wo = WorkOrder.create({ ...baseProps, assignedUser: mechanic as unknown as User });
      expect(wo.assignedUserId).toBe('u4');

      wo.update({ assignedUser: null });

      expect(wo.assignedUserId).toBeNull();
      expect(wo.assignedUser).toBeNull();
    });

    it('should throw DomainValidationException for invalid fields on update', () => {
      const wo = WorkOrder.create(baseProps);
      expect(() => wo.update({ mileageAtService: -100 })).toThrow(DomainValidationException);
    });

    it('should set problemDescription to null when update receives null', () => {
      const wo = WorkOrder.create({
        ...baseProps,
        problemDescription: 'Descrição inicial',
      });

      wo.update({ problemDescription: null });

      expect(wo.problemDescription).toBeNull();
    });

    it('should set internalNotes to null when update receives null', () => {
      const wo = WorkOrder.create({
        ...baseProps,
        internalNotes: 'Nota inicial',
      });

      wo.update({ internalNotes: null });

      expect(wo.internalNotes).toBeNull();
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
      const wo = createMockWorkOrder({ status: WorkOrderStatus.COMPLETED });
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
      const wo = createMockWorkOrder({ status: WorkOrderStatus.AWAITING_APPROVAL });
      wo.changeStatus(WorkOrderStatus.REJECTED);

      expect(wo.rejectedAt).toBeInstanceOf(Date);
    });

    it('should set approvedAt when transitioning to APPROVED (updateTimestampsForStatus)', () => {
      const wo = createMockWorkOrder({ status: WorkOrderStatus.AWAITING_APPROVAL });
      wo.changeStatus(WorkOrderStatus.APPROVED);

      expect(wo.approvedAt).toBeInstanceOf(Date);
    });

    it('should set startedAt when transitioning to IN_PROGRESS (updateTimestampsForStatus)', () => {
      const wo = createMockWorkOrder({ status: WorkOrderStatus.APPROVED });
      wo.changeStatus(WorkOrderStatus.IN_PROGRESS);

      expect(wo.startedAt).toBeInstanceOf(Date);
    });

    it('should set finishedAt when transitioning to COMPLETED (updateTimestampsForStatus)', () => {
      const wo = createMockWorkOrder({ status: WorkOrderStatus.IN_PROGRESS });
      wo.changeStatus(WorkOrderStatus.COMPLETED);

      expect(wo.finishedAt).toBeInstanceOf(Date);
    });

    it('should set deliveredAt when transitioning to DELIVERED (updateTimestampsForStatus)', () => {
      const wo = createMockWorkOrder({ status: WorkOrderStatus.COMPLETED });
      wo.changeStatus(WorkOrderStatus.DELIVERED);

      expect(wo.deliveredAt).toBeInstanceOf(Date);
    });

    it('REJECTED -> AWAITING_APPROVAL is allowed', () => {
      const wo = createMockWorkOrder({ status: WorkOrderStatus.AWAITING_APPROVAL });
      wo.changeStatus(WorkOrderStatus.REJECTED);
      wo.changeStatus(WorkOrderStatus.AWAITING_APPROVAL);

      expect(wo.status).toBe(WorkOrderStatus.AWAITING_APPROVAL);
    });

    it('REJECTED -> IN_DIAGNOSIS should throw', () => {
      const wo = createMockWorkOrder({ status: WorkOrderStatus.AWAITING_APPROVAL });
      wo.changeStatus(WorkOrderStatus.REJECTED);

      expect(() => wo.changeStatus(WorkOrderStatus.IN_DIAGNOSIS)).toThrow(
        BusinessRuleViolationException,
      );
    });

    it('should fall back to empty transitions when current status is not in the map', () => {
      const wo = createMockWorkOrder({ status: 'UNKNOWN_STATUS' as unknown as WorkOrderStatus });

      expect(() => wo.changeStatus(WorkOrderStatus.IN_DIAGNOSIS)).toThrow(
        BusinessRuleViolationException,
      );
    });
  });

  describe('ensureCanCreateQuote()', () => {
    it('should not throw for IN_DIAGNOSIS status', () => {
      const wo = createMockWorkOrder({ status: WorkOrderStatus.IN_DIAGNOSIS });
      expect(() => wo.ensureCanCreateQuote()).not.toThrow();
    });

    it('should not throw for AWAITING_APPROVAL status', () => {
      const wo = createMockWorkOrder({ status: WorkOrderStatus.AWAITING_APPROVAL });
      expect(() => wo.ensureCanCreateQuote()).not.toThrow();
    });

    it('should not throw for REJECTED status', () => {
      const wo = createMockWorkOrder({ status: WorkOrderStatus.REJECTED });
      expect(() => wo.ensureCanCreateQuote()).not.toThrow();
    });

    it('should throw for RECEIVED status', () => {
      const wo = WorkOrder.create(baseProps);
      expect(() => wo.ensureCanCreateQuote()).toThrow(BusinessRuleViolationException);
    });
  });

  describe('startServiceItem()', () => {
    it('should start service and transition WO to IN_PROGRESS', () => {
      const serviceId = randomUUID();
      const woService = createMockWorkOrderService({
        serviceId,
        status: WorkOrderServiceStatus.PENDING,
      });
      const wo = WorkOrder.reconstitute({
        id: randomUUID(),
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.APPROVED,
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
        services: [woService],
      });

      wo.startServiceItem(serviceId);

      expect(woService.status).toBe(WorkOrderServiceStatus.IN_PROGRESS);
      expect(wo.status).toBe(WorkOrderStatus.IN_PROGRESS);
    });

    it('should start service without changing WO status when already IN_PROGRESS', () => {
      const serviceId = randomUUID();
      const woService = createMockWorkOrderService({
        serviceId,
        status: WorkOrderServiceStatus.PENDING,
      });
      const wo = WorkOrder.reconstitute({
        id: randomUUID(),
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.IN_PROGRESS,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        services: [woService],
      });

      wo.startServiceItem(serviceId);

      expect(woService.status).toBe(WorkOrderServiceStatus.IN_PROGRESS);
      expect(wo.status).toBe(WorkOrderStatus.IN_PROGRESS);
    });

    it('should throw EntityNotFoundException when service not found', () => {
      const wo = createMockWorkOrder({ services: [] });

      expect(() => wo.startServiceItem(randomUUID())).toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when services is undefined', () => {
      const wo = WorkOrder.create(baseProps);
      // services is undefined by default after create

      expect(() => wo.startServiceItem(randomUUID())).toThrow(EntityNotFoundException);
    });

    it('should throw BusinessRuleViolationException when service already IN_PROGRESS', () => {
      const serviceId = randomUUID();
      const woService = createMockWorkOrderService({
        serviceId,
        status: WorkOrderServiceStatus.IN_PROGRESS,
      });
      const wo = createMockWorkOrder({
        status: WorkOrderStatus.IN_PROGRESS,
        services: [woService],
      });

      expect(() => wo.startServiceItem(serviceId)).toThrow(BusinessRuleViolationException);
    });
  });

  describe('completeServiceItem()', () => {
    it('should complete service and transition WO to COMPLETED when all services done', () => {
      const serviceId = randomUUID();
      const woService = createMockWorkOrderService({
        serviceId,
        status: WorkOrderServiceStatus.IN_PROGRESS,
      });
      const wo = WorkOrder.reconstitute({
        id: randomUUID(),
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.IN_PROGRESS,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        services: [woService],
      });

      wo.completeServiceItem(serviceId);

      expect(woService.status).toBe(WorkOrderServiceStatus.COMPLETED);
      expect(wo.status).toBe(WorkOrderStatus.COMPLETED);
    });

    it('should complete service and transition WO to COMPLETED when multiple services all done', () => {
      const serviceId = randomUUID();
      const woService1 = createMockWorkOrderService({
        serviceId,
        status: WorkOrderServiceStatus.IN_PROGRESS,
      });
      const woService2 = createMockWorkOrderService({
        serviceId: randomUUID(),
        status: WorkOrderServiceStatus.COMPLETED,
      });
      const wo = WorkOrder.reconstitute({
        id: randomUUID(),
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.IN_PROGRESS,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        services: [woService1, woService2],
      });

      wo.completeServiceItem(serviceId);

      expect(woService1.status).toBe(WorkOrderServiceStatus.COMPLETED);
      expect(wo.status).toBe(WorkOrderStatus.COMPLETED);
    });

    it('should complete service without changing WO status when other services remain', () => {
      const serviceId = randomUUID();
      const completingService = createMockWorkOrderService({
        serviceId,
        status: WorkOrderServiceStatus.IN_PROGRESS,
      });
      const pendingService = createMockWorkOrderService({
        serviceId: randomUUID(),
        status: WorkOrderServiceStatus.PENDING,
      });
      const wo = WorkOrder.reconstitute({
        id: randomUUID(),
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.IN_PROGRESS,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        services: [completingService, pendingService],
      });

      wo.completeServiceItem(serviceId);

      expect(completingService.status).toBe(WorkOrderServiceStatus.COMPLETED);
      expect(wo.status).toBe(WorkOrderStatus.IN_PROGRESS);
    });

    it('should throw EntityNotFoundException when service not found', () => {
      const wo = createMockWorkOrder({ services: [] });

      expect(() => wo.completeServiceItem(randomUUID())).toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when services is undefined', () => {
      const wo = WorkOrder.create(baseProps);
      // services is undefined by default after create

      expect(() => wo.completeServiceItem(randomUUID())).toThrow(EntityNotFoundException);
    });

    it('should throw BusinessRuleViolationException when service already COMPLETED', () => {
      const serviceId = randomUUID();
      const woService = createMockWorkOrderService({
        serviceId,
        status: WorkOrderServiceStatus.COMPLETED,
      });
      const wo = WorkOrder.reconstitute({
        id: randomUUID(),
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.IN_PROGRESS,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 0,
        approvedAt: null,
        rejectedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        services: [woService],
      });

      expect(() => wo.completeServiceItem(serviceId)).toThrow(BusinessRuleViolationException);
    });
  });

  describe('applyQuoteItems()', () => {
    it('should create WO service/part items and recalculate totalAmount from item prices', () => {
      const qService = createMockQuoteService();
      const qPart = createMockQuotePartSupply();
      const quote = createMockQuote({ services: [qService], partsSupplies: [qPart] });

      const wo = WorkOrder.create(baseProps);
      const result = wo.applyQuoteItems(quote);

      expect(result.services).toHaveLength(1);
      expect(result.partSupplies).toHaveLength(1);
      expect(result.services[0].serviceId).toBe(qService.serviceId);
      expect(result.partSupplies[0].partSupplyId).toBe(qPart.partSupplyId);
      expect(wo.totalAmount).toBe(
        result.services[0].totalPrice + result.partSupplies[0].totalPrice,
      );
      expect(wo.services).toHaveLength(1);
      expect(wo.partSupplies).toHaveLength(1);
    });

    it('should handle quote with no services or parts', () => {
      const quote = createMockQuote({ services: [], partsSupplies: [] });

      const wo = WorkOrder.create(baseProps);
      const result = wo.applyQuoteItems(quote);

      expect(result.services).toHaveLength(0);
      expect(result.partSupplies).toHaveLength(0);
      expect(wo.totalAmount).toBe(0);
    });

    it('should treat undefined services as empty array', () => {
      const qPart = createMockQuotePartSupply();
      const quote = createMockQuote({ partsSupplies: [qPart] });

      const wo = WorkOrder.create(baseProps);
      const result = wo.applyQuoteItems(quote);

      expect(result.services).toHaveLength(0);
      expect(result.partSupplies).toHaveLength(1);
    });

    it('should treat undefined partsSupplies as empty array', () => {
      const qService = createMockQuoteService();
      const quote = createMockQuote({ services: [qService] });

      const wo = WorkOrder.create(baseProps);
      const result = wo.applyQuoteItems(quote);

      expect(result.services).toHaveLength(1);
      expect(result.partSupplies).toHaveLength(0);
    });

    it('should throw BusinessRuleViolationException when a service was already added', () => {
      const serviceId = randomUUID();
      const qService = createMockQuoteService({ serviceId });
      const quote = createMockQuote({ services: [qService], partsSupplies: [] });

      const wo = WorkOrder.create(baseProps);
      wo.applyQuoteItems(quote);

      const quote2 = createMockQuote({ services: [qService], partsSupplies: [] });
      expect(() => wo.applyQuoteItems(quote2)).toThrow(BusinessRuleViolationException);
    });

    it('should throw BusinessRuleViolationException when a part/supply was already added', () => {
      const partSupplyId = randomUUID();
      const qPart = createMockQuotePartSupply({ partSupplyId });
      const quote = createMockQuote({ services: [], partsSupplies: [qPart] });

      const wo = WorkOrder.create(baseProps);
      wo.applyQuoteItems(quote);

      const quote2 = createMockQuote({ services: [], partsSupplies: [qPart] });
      expect(() => wo.applyQuoteItems(quote2)).toThrow(BusinessRuleViolationException);
    });
  });
});
