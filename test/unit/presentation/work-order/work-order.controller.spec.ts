import { WorkOrderController } from '@presentation/work-order/work-order.controller';
import { randomUUID } from 'node:crypto';
import { WorkOrderPresenter } from '@presentation/work-order/work-order.presenter';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { Quote } from '@domain/entities/quote.entity';
import { ICreateWorkOrderUseCase } from '@domain/interfaces/use-cases/work-order/create-work-order.use-case.interface';
import { IFindWorkOrderByIdUseCase } from '@domain/interfaces/use-cases/work-order/find-work-order-by-id.use-case.interface';
import { IFindAllWorkOrdersPaginatedUseCase } from '@domain/interfaces/use-cases/work-order/find-all-work-orders-paginated.use-case.interface';
import { IUpdateWorkOrderUseCase } from '@domain/interfaces/use-cases/work-order/update-work-order.use-case.interface';
import { IUpdateWorkOrderStatusUseCase } from '@domain/interfaces/use-cases/work-order/update-work-order-status.use-case.interface';
import { IUpdateWorkOrderServiceStatusUseCase } from '@domain/interfaces/use-cases/work-order/update-work-order-service-status.use-case.interface';
import { IFindWorkOrderStatusHistoryUseCase } from '@domain/interfaces/use-cases/reporting/find-work-order-status-history.use-case.interface';
import { IFindWorkOrderQuotesUseCase } from '@domain/interfaces/use-cases/quote/find-work-order-quotes.use-case.interface';

describe('WorkOrderController', () => {
  let controller: WorkOrderController;
  let createUseCase: jest.Mocked<ICreateWorkOrderUseCase>;
  let findByIdUseCase: jest.Mocked<IFindWorkOrderByIdUseCase>;
  let findAllPaginatedUseCase: jest.Mocked<IFindAllWorkOrdersPaginatedUseCase>;
  let updateUseCase: jest.Mocked<IUpdateWorkOrderUseCase>;
  let updateStatusUseCase: jest.Mocked<IUpdateWorkOrderStatusUseCase>;
  let updateServiceStatusUseCase: jest.Mocked<IUpdateWorkOrderServiceStatusUseCase>;
  let findStatusHistoryUseCase: jest.Mocked<IFindWorkOrderStatusHistoryUseCase>;
  let findWorkOrderQuotesUseCase: jest.Mocked<IFindWorkOrderQuotesUseCase>;

  beforeEach(() => {
    createUseCase = { execute: jest.fn() };
    findByIdUseCase = { execute: jest.fn() };
    findAllPaginatedUseCase = { execute: jest.fn() };
    updateUseCase = { execute: jest.fn() };
    updateStatusUseCase = { execute: jest.fn() };
    updateServiceStatusUseCase = { execute: jest.fn() };
    findStatusHistoryUseCase = { execute: jest.fn() };
    findWorkOrderQuotesUseCase = { execute: jest.fn() };

    controller = new WorkOrderController(
      createUseCase,
      findByIdUseCase,
      findAllPaginatedUseCase,
      updateUseCase,
      updateStatusUseCase,
      updateServiceStatusUseCase,
      findStatusHistoryUseCase,
      findWorkOrderQuotesUseCase,
    );
  });

  it('should create a work order', async () => {
    const dto = { number: '001', customerId: randomUUID(), vehicleId: randomUUID() };
    const workOrder = { id: randomUUID(), ...dto };
    createUseCase.execute.mockResolvedValue(workOrder as unknown as WorkOrder);

    const userId = randomUUID();
    const result = await controller.create(dto, { sub: userId } as unknown as Parameters<
      typeof controller.create
    >[1]);

    expect(result).toEqual(WorkOrderPresenter.toDataResponse(workOrder as unknown as WorkOrder));
    expect(createUseCase.execute).toHaveBeenCalledWith({ ...dto, userId });
  });

  it('should find all work orders', async () => {
    const resultUseCase = {
      items: [],
      pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
    };
    findAllPaginatedUseCase.execute.mockResolvedValue(resultUseCase);

    const result = await controller.findAll({ page: 1, limit: 10 });

    expect(result).toEqual(
      WorkOrderPresenter.toPaginatedResponse(
        resultUseCase as unknown as Parameters<typeof WorkOrderPresenter.toPaginatedResponse>[0],
      ),
    );
    expect(findAllPaginatedUseCase.execute).toHaveBeenCalled();
  });

  it('should find all work orders with default values', async () => {
    findAllPaginatedUseCase.execute.mockResolvedValue({
      items: [],
      pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
    });
    await controller.findAll({});
    expect(findAllPaginatedUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
    );
  });

  it('should find one work order', async () => {
    const id = randomUUID();
    const workOrder = { id, number: '001' };
    findByIdUseCase.execute.mockResolvedValue(workOrder as unknown as WorkOrder);

    const result = await controller.findOne(id);

    expect(result).toEqual(WorkOrderPresenter.toDataResponse(workOrder as unknown as WorkOrder));
    expect(findByIdUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should update a work order', async () => {
    const id = randomUUID();
    const dto = { problemDescription: 'test' };
    const workOrder = { id, ...dto };
    updateUseCase.execute.mockResolvedValue(workOrder as unknown as WorkOrder);

    const userId = randomUUID();
    const result = await controller.update(id, dto, { sub: userId } as unknown as Parameters<
      typeof controller.create
    >[1]);

    expect(result).toEqual(WorkOrderPresenter.toDataResponse(workOrder as unknown as WorkOrder));
    expect(updateUseCase.execute).toHaveBeenCalledWith(id, { ...dto, userId });
  });

  it('should update status', async () => {
    const id = randomUUID();
    const userId = randomUUID();
    const dto = { status: WorkOrderStatus.IN_PROGRESS, notes: 'starting' };
    const workOrder = { id, ...dto };
    updateStatusUseCase.execute.mockResolvedValue(workOrder as unknown as WorkOrder);

    const result = await controller.updateStatus(
      id,
      dto as unknown as Parameters<typeof controller.updateStatus>[1],
      { sub: userId } as unknown as Parameters<typeof controller.create>[1],
    );

    expect(result).toEqual(WorkOrderPresenter.toDataResponse(workOrder as unknown as WorkOrder));
    expect(updateStatusUseCase.execute).toHaveBeenCalledWith(id, { ...dto, userId });
  });

  it('should update status without user in request', async () => {
    const id = randomUUID();
    const dto = { status: WorkOrderStatus.IN_PROGRESS };
    updateStatusUseCase.execute.mockResolvedValue({ id, ...dto } as unknown as WorkOrder);
    await controller.updateStatus(
      id,
      dto as unknown as Parameters<typeof controller.updateStatus>[1],
      { sub: null } as unknown as Parameters<typeof controller.create>[1],
    );
    expect(updateStatusUseCase.execute).toHaveBeenCalledWith(id, { ...dto, userId: null });
  });

  it('should update service status', async () => {
    const workOrderId = randomUUID();
    const serviceId = randomUUID();
    const userId = randomUUID();
    const dto = { status: 'COMPLETED' };
    const mockService = {
      serviceId,
      quantity: 1,
      unitPrice: 100,
      totalPrice: 100,
      status: 'COMPLETED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    updateServiceStatusUseCase.execute.mockResolvedValue(
      mockService as unknown as WorkOrderService,
    );

    const result = await controller.updateServiceStatus(
      workOrderId,
      serviceId,
      dto as unknown as Parameters<typeof controller.updateServiceStatus>[2],
      { sub: userId } as unknown as Parameters<typeof controller.create>[1],
    );

    expect(result).toEqual({
      data: expect.objectContaining({
        id: serviceId,
        status: 'COMPLETED',
      }),
    });
    expect(updateServiceStatusUseCase.execute).toHaveBeenCalledWith({
      workOrderId,
      serviceId,
      status: dto.status,
      userId,
    });
  });

  it('should update service status without user in request', async () => {
    const workOrderId = randomUUID();
    const serviceId = randomUUID();
    const dto = { status: 'COMPLETED' };
    const mockService = {
      serviceId,
      quantity: 1,
      unitPrice: 100,
      totalPrice: 100,
      status: 'COMPLETED',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    updateServiceStatusUseCase.execute.mockResolvedValue(
      mockService as unknown as WorkOrderService,
    );

    const result = await controller.updateServiceStatus(
      workOrderId,
      serviceId,
      dto as unknown as Parameters<typeof controller.updateServiceStatus>[2],
      { sub: null } as unknown as Parameters<typeof controller.create>[1],
    );

    expect(result).toEqual({
      data: expect.objectContaining({
        id: serviceId,
        status: 'COMPLETED',
      }),
    });
    expect(updateServiceStatusUseCase.execute).toHaveBeenCalledWith({
      workOrderId,
      serviceId,
      status: dto.status,
      userId: null,
    });
  });

  it('should get status history', async () => {
    const id = randomUUID();
    const history = [{ id: randomUUID(), newStatus: 'RECEIVED', createdAt: new Date() }];
    findStatusHistoryUseCase.execute.mockResolvedValue(history as unknown as StatusHistory[]);

    const result = await controller.getStatusHistory(id);

    expect(result.data).toHaveLength(1);
    expect(findStatusHistoryUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should get status history with changedBy populated', async () => {
    const id = randomUUID();
    const userId = randomUUID();
    const history = [
      {
        id: randomUUID(),
        newStatus: 'IN_DIAGNOSIS',
        createdAt: new Date(),
        changedBy: { id: userId, name: 'Mechanic', role: 'MECHANIC', email: 'mech@test.com' },
      },
    ];
    findStatusHistoryUseCase.execute.mockResolvedValue(history as unknown as StatusHistory[]);

    const result = await controller.getStatusHistory(id);

    expect(result.data[0].changedBy).toEqual({
      id: userId,
      name: 'Mechanic',
      role: 'MECHANIC',
      email: 'mech@test.com',
    });
  });

  it('should find quotes of a work order', async () => {
    const id = randomUUID();
    const quotes = [{ id: randomUUID(), workOrderId: id }];
    findWorkOrderQuotesUseCase.execute.mockResolvedValue(quotes as unknown as Quote[]);

    const result = await controller.findQuotes(id);

    expect(result.data).toHaveLength(1);
    expect(findWorkOrderQuotesUseCase.execute).toHaveBeenCalledWith(id);
  });
});
