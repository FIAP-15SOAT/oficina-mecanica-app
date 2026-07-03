import { randomUUID } from 'node:crypto';

import { WorkOrderController } from '@interface-adapters/work-order/work-order.controller';

import { WorkOrderPresenter } from '@interface-adapters/work-order/work-order.presenter';
import { QuotePresenter } from '@interface-adapters/quote/quote.presenter';

import { CreateWorkOrderRequest } from '@interface-adapters/work-order/requests/create-work-order-request';
import { UpdateWorkOrderRequest } from '@interface-adapters/work-order/requests/update-work-order-request';
import { UpdateWorkOrderStatusRequest } from '@interface-adapters/work-order/requests/update-work-order-status-request';
import { UpdateWorkOrderServiceStatusRequest } from '@interface-adapters/work-order/requests/update-work-order-service-status-request';

import { ICreateWorkOrderUseCase } from '@application/ports/input/work-order/create-work-order.use-case.interface';
import { IFindWorkOrderByIdUseCase } from '@application/ports/input/work-order/find-work-order-by-id.use-case.interface';
import { IFindAllWorkOrdersPaginatedUseCase } from '@application/ports/input/work-order/find-all-work-orders-paginated.use-case.interface';
import { IUpdateWorkOrderUseCase } from '@application/ports/input/work-order/update-work-order.use-case.interface';
import { IUpdateWorkOrderStatusUseCase } from '@application/ports/input/work-order/update-work-order-status.use-case.interface';
import { IUpdateWorkOrderServiceStatusUseCase } from '@application/ports/input/work-order/update-work-order-service-status.use-case.interface';
import { IFindWorkOrderStatusHistoryUseCase } from '@application/ports/input/work-order/find-work-order-status-history.use-case.interface';
import { IFindWorkOrderQuotesUseCase } from '@application/ports/input/quote/find-work-order-quotes.use-case.interface';

import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { StatusHistory } from '@domain/entities/status-history.entity';

import { createMockCustomer } from '../../../helpers/customer-mock.factory';
import { createMockVehicle } from '../../../helpers/vehicle-mock.factory';
import { createMockWorkOrder } from '../../../helpers/work-order-mock.factory';
import { createMockWorkOrderService } from '../../../helpers/work-order-service-mock.factory';
import { createMockService } from '../../../helpers/service-mock.factory';
import { createMockQuote } from '../../../helpers/quote-mock.factory';

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

  const customer = createMockCustomer();
  const vehicle = createMockVehicle({ customerId: customer.id });

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

  describe('create', () => {
    it('should attach the userId and return the work order wrapped in data', async () => {
      const userId = randomUUID();

      const request: CreateWorkOrderRequest = {
        customerId: customer.id,
        vehicleId: vehicle.id,
      };

      const created = createMockWorkOrder({
        customerId: customer.id,
        vehicleId: vehicle.id,
        customer,
        vehicle,
      });

      createUseCase.execute.mockResolvedValue(created);

      const result = await controller.create(request, userId);

      expect(result).toEqual(WorkOrderPresenter.toDataResponse(created));
      expect(createUseCase.execute).toHaveBeenCalledWith({ ...request, userId });
    });
  });

  describe('findAll', () => {
    it('should default page and limit when missing and forward filters', async () => {
      const workOrder = createMockWorkOrder({ customer, vehicle });

      findAllPaginatedUseCase.execute.mockResolvedValue({
        items: [workOrder],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      const result = await controller.findAll({ status: WorkOrderStatus.RECEIVED });

      expect(result).toEqual(
        WorkOrderPresenter.toPaginatedResponse({
          items: [workOrder],
          pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
        }),
      );

      expect(findAllPaginatedUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: WorkOrderStatus.RECEIVED,
      });
    });

    it('should forward provided page, limit and sort', async () => {
      findAllPaginatedUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 2, limit: 5 },
      });

      await controller.findAll({ page: 2, limit: 5, sort: 'createdAt:asc' });

      expect(findAllPaginatedUseCase.execute).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        sort: 'createdAt:asc',
      });
    });
  });

  describe('findOne', () => {
    it('should return the work order wrapped in data', async () => {
      const workOrder = createMockWorkOrder({ customer, vehicle });

      findByIdUseCase.execute.mockResolvedValue(workOrder);

      const result = await controller.findOne(workOrder.id);

      expect(result).toEqual(WorkOrderPresenter.toDataResponse(workOrder));
      expect(findByIdUseCase.execute).toHaveBeenCalledWith(workOrder.id);
    });
  });

  describe('update', () => {
    it('should attach the userId and return the updated work order wrapped in data', async () => {
      const userId = randomUUID();
      const request: UpdateWorkOrderRequest = { problemDescription: 'Barulho no motor' };

      const updated = createMockWorkOrder({
        customer,
        vehicle,
        problemDescription: request.problemDescription,
      });

      updateUseCase.execute.mockResolvedValue(updated);

      const result = await controller.update(updated.id, request, userId);

      expect(result).toEqual(WorkOrderPresenter.toDataResponse(updated));
      expect(updateUseCase.execute).toHaveBeenCalledWith(updated.id, { ...request, userId });
    });
  });

  describe('updateStatus', () => {
    it('should attach the userId and return the updated work order wrapped in data', async () => {
      const userId = randomUUID();

      const request: UpdateWorkOrderStatusRequest = {
        status: WorkOrderStatus.IN_DIAGNOSIS,
        notes: 'Iniciando diagnóstico',
      };

      const updated = createMockWorkOrder({
        customer,
        vehicle,
        status: WorkOrderStatus.IN_DIAGNOSIS,
      });

      updateStatusUseCase.execute.mockResolvedValue(updated);

      const result = await controller.updateStatus(updated.id, request, userId);

      expect(result).toEqual(WorkOrderPresenter.toDataResponse(updated));
      expect(updateStatusUseCase.execute).toHaveBeenCalledWith(updated.id, {
        status: request.status,
        notes: request.notes,
        userId,
      });
    });
  });

  describe('updateServiceStatus', () => {
    it('should attach the userId and return the updated service item wrapped in data', async () => {
      const userId = randomUUID();
      const workOrderId = randomUUID();

      const request: UpdateWorkOrderServiceStatusRequest = {
        status: WorkOrderServiceStatus.COMPLETED,
      };

      const service = createMockService();

      const workOrderService = createMockWorkOrderService({
        workOrderId,
        serviceId: service.id,
        status: WorkOrderServiceStatus.COMPLETED,
      });

      workOrderService.service = service;
      updateServiceStatusUseCase.execute.mockResolvedValue(workOrderService);

      const result = await controller.updateServiceStatus(
        workOrderId,
        workOrderService.serviceId,
        request,
        userId,
      );

      expect(result).toEqual(WorkOrderPresenter.toServiceItemDataResponse(workOrderService));
      expect(updateServiceStatusUseCase.execute).toHaveBeenCalledWith({
        workOrderId,
        serviceId: workOrderService.serviceId,
        status: request.status,
        userId,
      });
    });
  });

  describe('getStatusHistory', () => {
    it('should return the status history wrapped in data', async () => {
      const history: StatusHistory[] = [];

      findStatusHistoryUseCase.execute.mockResolvedValue(history);

      const result = await controller.getStatusHistory(randomUUID());

      expect(result).toEqual(WorkOrderPresenter.toStatusHistoryListResponse(history));
    });

    it('should forward the work order id to the use case', async () => {
      const id = randomUUID();

      findStatusHistoryUseCase.execute.mockResolvedValue([]);

      await controller.getStatusHistory(id);

      expect(findStatusHistoryUseCase.execute).toHaveBeenCalledWith(id);
    });
  });

  describe('findQuotes', () => {
    it('should return quotes of the work order wrapped in data', async () => {
      const workOrder = createMockWorkOrder({ customer, vehicle });

      const quote = createMockQuote({ workOrderId: workOrder.id });
      quote.workOrder = workOrder;

      findWorkOrderQuotesUseCase.execute.mockResolvedValue([quote]);

      const result = await controller.findQuotes(workOrder.id);

      expect(result).toEqual(QuotePresenter.toListResponse([quote]));
      expect(findWorkOrderQuotesUseCase.execute).toHaveBeenCalledWith(workOrder.id);
    });
  });
});
