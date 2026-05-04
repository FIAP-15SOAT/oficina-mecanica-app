import { randomUUID } from 'node:crypto';
import { UpdateWorkOrderUseCase } from '@application/use-cases/work-order/update-work-order.use-case';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { UserRole } from '@domain/enums/user-role.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { createMockWorkOrder, createMockWorkOrderRepository } from '../../../../helpers/work-order-mock.factory';

describe('UpdateWorkOrderUseCase', () => {
  let useCase: UpdateWorkOrderUseCase;
  let workOrderRepository: any;
  let userRepository: any;

  beforeEach(() => {
    workOrderRepository = createMockWorkOrderRepository();
    userRepository = { findById: jest.fn() };
    useCase = new UpdateWorkOrderUseCase(workOrderRepository, userRepository);
  });

  it('should update a work order in RECEIVED status', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    const updated = createMockWorkOrder({ ...wo, problemDescription: 'Barulho na suspensão' });

    workOrderRepository.findById.mockResolvedValue(wo);
    workOrderRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(wo.id, {
      problemDescription: 'Barulho na suspensão',
      userId: randomUUID(),
    });

    expect(result.problemDescription).toBe('Barulho na suspensão');
    expect(workOrderRepository.update).toHaveBeenCalledTimes(1);
  });

  it('should update a work order and assign a user (active mechanic)', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    const userId = 'user-uuid';
    const user = { id: userId, name: 'John', role: UserRole.MECHANIC, isActive: true };
    const updated = createMockWorkOrder({ ...wo, assignedUserId: userId });

    workOrderRepository.findById.mockResolvedValue(wo);
    userRepository.findById.mockResolvedValue(user);
    workOrderRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(wo.id, {
      assignedUserId: userId,
      userId: randomUUID(),
    });

    expect(result.assignedUserId).toBe(userId);
    expect(userRepository.findById).toHaveBeenCalledWith(userId);
  });

  it('should throw BusinessRuleViolationException when assigned user is not a mechanic', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    const user = { id: 'user-id', name: 'John', role: UserRole.ADMIN, isActive: true };

    workOrderRepository.findById.mockResolvedValue(wo);
    userRepository.findById.mockResolvedValue(user);

    await expect(
      useCase.execute(wo.id, { assignedUserId: user.id, userId: randomUUID() }),
    ).rejects.toThrow(BusinessRuleViolationException);
    await expect(
      useCase.execute(wo.id, { assignedUserId: user.id, userId: randomUUID() }),
    ).rejects.toThrow('Apenas mecânicos ativos podem ser atribuídos a uma ordem de serviço');
  });

  it('should throw BusinessRuleViolationException when assigned user is inactive', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    const user = { id: 'user-id', name: 'John', role: UserRole.MECHANIC, isActive: false };

    workOrderRepository.findById.mockResolvedValue(wo);
    userRepository.findById.mockResolvedValue(user);

    await expect(
      useCase.execute(wo.id, { assignedUserId: user.id, userId: randomUUID() }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceNotFoundException when work order not found', async () => {
    workOrderRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('bad-id', { problemDescription: 'any', userId: randomUUID() }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw BusinessRuleViolationException when work order is APPROVED', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.APPROVED });
    workOrderRepository.findById.mockResolvedValue(wo);

    await expect(
      useCase.execute(wo.id, { problemDescription: 'any', userId: randomUUID() }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceNotFoundException when assigned user not found', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    workOrderRepository.findById.mockResolvedValue(wo);
    userRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(wo.id, { assignedUserId: 'bad-user', userId: randomUUID() }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(userRepository.findById).toHaveBeenCalledWith('bad-user');
  });
});
