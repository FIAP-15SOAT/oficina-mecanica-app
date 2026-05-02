import { CreateWorkOrderUseCase } from '@application/use-cases/work-order/create-work-order.use-case';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { createMockWorkOrder } from '../../../../helpers/work-order-mock.factory';
import { createMockCustomer } from '../../../../helpers/customer-mock.factory';
import { createMockVehicle } from '../../../../helpers/vehicle-mock.factory';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';

import { IUnitOfWork, IRepositories } from '@domain/interfaces/repositories/unit-of-work.interface';

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
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({} as any);

    const result = await useCase.execute({
      customerId: customer.id,
      vehicleId: vehicle.id,
    });

    expect(result).toBe(createdWO);
    expect(mockRepos.workOrder.create).toHaveBeenCalledTimes(1);
    expect(mockRepos.statusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ newStatus: WorkOrderStatus.RECEIVED }),
    );
  });

  it('should create a work order with assigned user', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: customer.id });
    const userId = 'user-uuid';
    const user = { id: userId, name: 'John' };
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
    (mockRepos.statusHistory.create as jest.Mock).mockResolvedValue({} as any);

    const result = await useCase.execute({
      customerId: customer.id,
      vehicleId: vehicle.id,
      assignedUserId: userId,
    });

    expect(result).toBe(createdWO);
    expect(mockRepos.user.findById).toHaveBeenCalledWith(userId);
    expect(mockRepos.workOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignedUserId: userId }),
    );
  });

  it('should throw ResourceNotFoundException when user not found', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: customer.id });

    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(vehicle);
    (mockRepos.user.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ customerId: customer.id, vehicleId: vehicle.id, assignedUserId: 'bad-user' }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw ResourceNotFoundException when customer not found', async () => {
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ customerId: 'bad-id', vehicleId: 'any' }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(mockRepos.workOrder.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when vehicle not found', async () => {
    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(createMockCustomer());
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({ customerId: 'c-id', vehicleId: 'bad-id' }),
    ).rejects.toThrow(ResourceNotFoundException);

    expect(mockRepos.workOrder.create).not.toHaveBeenCalled();
  });

  it('should throw BusinessRuleViolationException when vehicle does not belong to customer', async () => {
    const customer = createMockCustomer();
    const vehicle = createMockVehicle({ customerId: 'different-customer-id' });

    (mockRepos.customer.findById as jest.Mock).mockResolvedValue(customer);
    (mockRepos.vehicle.findById as jest.Mock).mockResolvedValue(vehicle);

    await expect(
      useCase.execute({ customerId: customer.id, vehicleId: vehicle.id }),
    ).rejects.toThrow();

    expect(mockRepos.workOrder.create).not.toHaveBeenCalled();
  });
});
