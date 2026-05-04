import { randomUUID } from 'node:crypto';
import { CreateWorkOrderUseCase } from '@application/use-cases/work-order/create-work-order.use-case';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';
import { createMockCustomer } from '../../../../helpers/customer-mock.factory';
import { createMockVehicle } from '../../../../helpers/vehicle-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';
import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';
import { UserRole } from '@domain/enums/user-role.enum';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

describe('CreateWorkOrderUseCase', () => {
  let useCase: CreateWorkOrderUseCase;
  let mockRepos: jest.Mocked<IRepositories>;
  let mockUow: jest.Mocked<IUnitOfWork>;

  beforeEach(() => {
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    mockRepos = repos;
    mockUow = unitOfWork;
    useCase = new CreateWorkOrderUseCase(mockUow);
  });

  it('should create a work order and initial status history', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: customer.id });
    const createdWO = createMockWorkOrder({ customerId: customer.id, vehicleId: vehicle.id });

    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(vehicle);
    (mockRepos.workOrder.generateNextNumber as jest.Mock).mockResolvedValue('000001');
    (mockRepos.workOrder.create as jest.Mock).mockResolvedValue(createdWO);
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute({
      customerId: customer.id,
      vehicleId: vehicle.id,
      userId: randomUUID(),
    });

    expect(result).toBe(createdWO);
    expect(mockRepos.workOrder.create).toHaveBeenCalledTimes(1);
    expect(mockRepos.statusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ newStatus: WorkOrderStatus.RECEIVED }),
    );
  });

  it('should create a work order with assigned user (active mechanic)', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: customer.id });
    const userId = 'user-uuid';
    const user = { id: userId, name: 'John', role: UserRole.MECHANIC, isActive: true };
    const createdWO = createMockWorkOrder({
      customerId: customer.id,
      vehicleId: vehicle.id,
      assignedUserId: userId,
    });

    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(vehicle);
    (mockRepos.user.findById as jest.Mock).mockResolvedValue(user);
    (mockRepos.workOrder.generateNextNumber as jest.Mock).mockResolvedValue('000001');
    (mockRepos.workOrder.create as jest.Mock).mockResolvedValue(createdWO);
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});

    const result = await useCase.execute({
      customerId: customer.id,
      vehicleId: vehicle.id,
      assignedUserId: userId,
      userId: randomUUID(),
    });

    expect(result).toBe(createdWO);
    expect(mockRepos.user.findById).toHaveBeenCalledWith(userId);
    expect(mockRepos.workOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignedUserId: userId }),
    );
  });

  it('should throw BusinessRuleViolationException when assigned user is not a mechanic', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: customer.id });
    const user = { id: 'user-id', name: 'John', role: UserRole.ADMIN, isActive: true };

    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(vehicle);
    (mockRepos.user.findById as jest.Mock).mockResolvedValue(user);

    await expect(
      useCase.execute({
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: user.id,
        userId: randomUUID(),
      }),
    ).rejects.toThrow(BusinessRuleViolationException);
    await expect(
      useCase.execute({
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: user.id,
        userId: randomUUID(),
      }),
    ).rejects.toThrow('Apenas mecânicos ativos podem ser atribuídos a uma ordem de serviço');
  });

  it('should throw BusinessRuleViolationException when assigned user is inactive', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: customer.id });
    const user = { id: 'user-id', name: 'John', role: UserRole.MECHANIC, isActive: false };

    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(vehicle);
    (mockRepos.user.findById as jest.Mock).mockResolvedValue(user);

    await expect(
      useCase.execute({
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: user.id,
        userId: randomUUID(),
      }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should throw ResourceNotFoundException when user not found', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: customer.id });

    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(vehicle);
    (mockRepos.user.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        customerId: customer.id,
        vehicleId: vehicle.id,
        assignedUserId: 'bad-user',
        userId: randomUUID(),
      }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw ResourceNotFoundException when customer not found', async () => {
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ customerId: 'bad-id', vehicleId: 'any', userId: randomUUID() }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(mockRepos.workOrder.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when vehicle not found', async () => {
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(createMockCustomer());
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ customerId: 'c-id', vehicleId: 'bad-id', userId: randomUUID() }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(mockRepos.workOrder.create).not.toHaveBeenCalled();
  });

  it('should set changedById to null when userId is not provided', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: customer.id });
    const createdWO = createMockWorkOrder({ customerId: customer.id, vehicleId: vehicle.id });

    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(vehicle);
    (mockRepos.workOrder.generateNextNumber as jest.Mock).mockResolvedValue('000001');
    (mockRepos.workOrder.create as jest.Mock).mockResolvedValue(createdWO);
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({});

    await useCase.execute({
      customerId: customer.id,
      vehicleId: vehicle.id,
      userId: undefined as unknown as string,
    });

    expect(mockRepos.statusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ changedById: null }),
    );
  });

  it('should throw BusinessRuleViolationException when vehicle does not belong to customer', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: 'different-customer-id' });

    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(vehicle);

    await expect(
      useCase.execute({ customerId: customer.id, vehicleId: vehicle.id, userId: randomUUID() }),
    ).rejects.toThrow();

    expect(mockRepos.workOrder.create).not.toHaveBeenCalled();
  });
});
