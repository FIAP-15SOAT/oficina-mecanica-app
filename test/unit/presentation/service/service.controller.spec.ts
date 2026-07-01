import { randomUUID } from 'node:crypto';
import { ServiceController } from '@presentation/service/service.controller';
import { createMockService } from '../../../helpers/service-mock.factory';
import { CreateServiceRequestDto } from '@presentation/service/dto/create-service-request.dto';
import { UpdateServiceRequestDto } from '@presentation/service/dto/update-service-request.dto';
import { ICreateServiceUseCase } from '@application/ports/input/service/create-service.use-case.interface';
import { IFindServiceByIdUseCase } from '@application/ports/input/service/find-service-by-id.use-case.interface';
import { IFindAllServicesPaginatedUseCase } from '@application/ports/input/service/find-all-services-paginated.use-case.interface';
import { IUpdateServiceUseCase } from '@application/ports/input/service/update-service.use-case.interface';
import { IDeleteServiceUseCase } from '@application/ports/input/service/delete-service.use-case.interface';
import {
  IFindServiceMetricsUseCase,
  ServiceMetrics,
} from '@application/ports/input/service/find-service-metrics.use-case.interface';
import { IFindAllServicesMetricsUseCase } from '@application/ports/input/service/find-all-services-metrics.use-case.interface';

describe('ServiceController', () => {
  let controller: ServiceController;
  let createServiceUseCase: jest.Mocked<ICreateServiceUseCase>;
  let findServiceByIdUseCase: jest.Mocked<IFindServiceByIdUseCase>;
  let findAllServicesPaginatedUseCase: jest.Mocked<IFindAllServicesPaginatedUseCase>;
  let updateServiceUseCase: jest.Mocked<IUpdateServiceUseCase>;
  let deleteServiceUseCase: jest.Mocked<IDeleteServiceUseCase>;
  let findServiceMetricsUseCase: jest.Mocked<IFindServiceMetricsUseCase>;
  let _findAllServicesMetricsUseCase: jest.Mocked<IFindAllServicesMetricsUseCase>;

  beforeEach(() => {
    createServiceUseCase = { execute: jest.fn() };
    findServiceByIdUseCase = { execute: jest.fn() };
    findAllServicesPaginatedUseCase = { execute: jest.fn() };
    updateServiceUseCase = { execute: jest.fn() };
    deleteServiceUseCase = { execute: jest.fn() };
    findServiceMetricsUseCase = { execute: jest.fn() };
    _findAllServicesMetricsUseCase = { execute: jest.fn() };

    controller = new ServiceController(
      createServiceUseCase,
      findServiceByIdUseCase,
      findAllServicesPaginatedUseCase,
      updateServiceUseCase,
      deleteServiceUseCase,
      findServiceMetricsUseCase,
    );
  });

  describe('create', () => {
    it('should create a service successfully', async () => {
      const request: CreateServiceRequestDto = {
        name: 'Tire Rotation',
        description: 'Complete tire rotation service',
        basePrice: 49.99,
        estimatedTimeMin: 20,
      };

      const createdService = createMockService({
        name: request.name,
        description: request.description,
        basePrice: request.basePrice,
        estimatedTimeMin: request.estimatedTimeMin,
      });

      createServiceUseCase.execute.mockResolvedValue(createdService);

      const result = await controller.create(request);

      expect(result).toEqual({ data: createdService });
      expect(createServiceUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('findAll', () => {
    it('should return paginated services', async () => {
      const services = [
        createMockService({ id: randomUUID(), name: 'Service 1' }),
        createMockService({ id: randomUUID(), name: 'Service 2' }),
      ];

      const paginatedResult = {
        items: services,
        pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
      };

      findAllServicesPaginatedUseCase.execute.mockResolvedValue(paginatedResult);

      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query);

      expect(result).toEqual({
        data: paginatedResult.items,
        pagination: paginatedResult.pagination,
      });
      expect(findAllServicesPaginatedUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('should use default values when page and limit are missing', async () => {
      findAllServicesPaginatedUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
      });

      await controller.findAll({});

      expect(findAllServicesPaginatedUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });
  });

  describe('findById', () => {
    it('should return a service by id', async () => {
      const id = randomUUID();
      const service = createMockService({ id });

      findServiceByIdUseCase.execute.mockResolvedValue(service);

      const result = await controller.findById(id);

      expect(result).toEqual({ data: service });
      expect(findServiceByIdUseCase.execute).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a service successfully', async () => {
      const id = randomUUID();
      const request: UpdateServiceRequestDto = {
        name: 'Updated Service',
        description: 'Updated description',
        basePrice: 149.99,
        estimatedTimeMin: 45,
      };

      const updatedService = createMockService({
        id,
        name: request.name,
        description: request.description,
        basePrice: request.basePrice,
        estimatedTimeMin: request.estimatedTimeMin,
      });

      updateServiceUseCase.execute.mockResolvedValue(updatedService);

      const result = await controller.update(id, request);

      expect(result).toEqual({ data: updatedService });
      expect(updateServiceUseCase.execute).toHaveBeenCalledWith(id, request);
    });
  });

  describe('delete', () => {
    it('should delete a service successfully', async () => {
      const id = randomUUID();

      deleteServiceUseCase.execute.mockResolvedValue(undefined);

      await controller.delete(id);

      expect(deleteServiceUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for a service', async () => {
      const id = randomUUID();
      const mockMetrics: ServiceMetrics = {
        serviceId: id,
        serviceName: 'Service Test',
        executionCount: 10,
        averageTimeMinutes: 30,
      };

      findServiceMetricsUseCase.execute.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics(id);

      expect(result).toEqual({ data: mockMetrics });
      expect(findServiceMetricsUseCase.execute).toHaveBeenCalledWith(id);
    });
  });
});
