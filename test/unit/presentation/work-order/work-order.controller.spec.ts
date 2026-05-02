import { WorkOrderController } from '@presentation/work-order/work-order.controller';
import { randomUUID } from 'crypto';
import { WorkOrderPresenter } from '@presentation/work-order/work-order.presenter';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

describe('WorkOrderController', () => {
  let controller: WorkOrderController;
  let createUseCase: any;
  let findByIdUseCase: any;
  let findAllPaginatedUseCase: any;
  let updateUseCase: any;
  let updateStatusUseCase: any;
  let updateServiceStatusUseCase: any;
  let findStatusHistoryUseCase: any;
  let findWorkOrderQuotesUseCase: any;

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
    createUseCase.execute.mockResolvedValue(workOrder);

    const result = await controller.create(dto as any);

    expect(result).toEqual(WorkOrderPresenter.toDataResponse(workOrder as any));
    expect(createUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should find all work orders', async () => {
    const resultUseCase = { items: [], pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 } };
    findAllPaginatedUseCase.execute.mockResolvedValue(resultUseCase);

    const result = await controller.findAll({ page: 1, limit: 10 });

    expect(result).toEqual(WorkOrderPresenter.toPaginatedResponse(resultUseCase as any));
    expect(findAllPaginatedUseCase.execute).toHaveBeenCalled();
  });

  it('should find all work orders with default values', async () => {
    findAllPaginatedUseCase.execute.mockResolvedValue({ items: [], pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 } });
    await controller.findAll({});
    expect(findAllPaginatedUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 }));
  });

  it('should find one work order', async () => {
    const id = randomUUID();
    const workOrder = { id, number: '001' };
    findByIdUseCase.execute.mockResolvedValue(workOrder);

    const result = await controller.findOne(id);

    expect(result).toEqual(WorkOrderPresenter.toDataResponse(workOrder as any));
    expect(findByIdUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should update a work order', async () => {
    const id = randomUUID();
    const dto = { problemDescription: 'test' };
    const workOrder = { id, ...dto };
    updateUseCase.execute.mockResolvedValue(workOrder);

    const result = await controller.update(id, dto as any);

    expect(result).toEqual(WorkOrderPresenter.toDataResponse(workOrder as any));
    expect(updateUseCase.execute).toHaveBeenCalledWith(id, dto);
  });

  it('should update status', async () => {
    const id = randomUUID();
    const userId = randomUUID();
    const dto = { status: WorkOrderStatus.IN_PROGRESS, notes: 'starting' };
    const workOrder = { id, ...dto };
    updateStatusUseCase.execute.mockResolvedValue(workOrder);

    const result = await controller.updateStatus(id, dto as any, { user: { id: userId } } as any);

    expect(result).toEqual(WorkOrderPresenter.toDataResponse(workOrder as any));
    expect(updateStatusUseCase.execute).toHaveBeenCalledWith(id, { ...dto, userId });
  });

  it('should update status without user in request', async () => {
    const id = randomUUID();
    const dto = { status: WorkOrderStatus.IN_PROGRESS };
    updateStatusUseCase.execute.mockResolvedValue({ id, ...dto });
    await controller.updateStatus(id, dto as any, {});
    expect(updateStatusUseCase.execute).toHaveBeenCalledWith(id, { ...dto, userId: null });
  });

  it('should update service status', async () => {
    const workOrderId = randomUUID();
    const serviceId = randomUUID();
    const userId = randomUUID();
    const dto = { status: 'COMPLETED' };
    updateServiceStatusUseCase.execute.mockResolvedValue({ success: true });

    const result = await controller.updateServiceStatus(workOrderId, serviceId, dto as any, { user: { id: userId } } as any);

    expect(result).toEqual({ data: { success: true } });
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
    updateServiceStatusUseCase.execute.mockResolvedValue({ success: true });
    await controller.updateServiceStatus(workOrderId, serviceId, dto as any, {});
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
    findStatusHistoryUseCase.execute.mockResolvedValue(history);

    const result = await controller.getStatusHistory(id);

    expect(result.data).toHaveLength(1);
    expect(findStatusHistoryUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should find quotes of a work order', async () => {
    const id = randomUUID();
    const quotes = [{ id: randomUUID(), workOrderId: id }];
    findWorkOrderQuotesUseCase.execute.mockResolvedValue(quotes);

    const result = await controller.findQuotes(id);

    expect(result.data).toHaveLength(1);
    expect(findWorkOrderQuotesUseCase.execute).toHaveBeenCalledWith(id);
  });
});
