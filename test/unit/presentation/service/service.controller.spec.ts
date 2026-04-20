import { randomUUID } from 'crypto';
import { ServiceController } from '../../../../src/presentation/service/service.controller';
import { createMockService } from '../../../helpers/service-mock.factory';
import { CreateServiceRequestDto } from '../../../../src/presentation/service/dto/create-service-request.dto';
import { UpdateServiceRequestDto } from '../../../../src/presentation/service/dto/update-service-request.dto';
import { UpdateServiceStatusRequestDto } from '../../../../src/presentation/service/dto/update-service-status-request.dto';
import { CreateServiceUseCase } from '../../../../src/application/use-cases/service/create-service.use-case';
import { FindServiceByIdUseCase } from '../../../../src/application/use-cases/service/find-service-by-id.use-case';
import { FindAllServicesPaginatedUseCase } from '../../../../src/application/use-cases/service/find-all-services-paginated.use-case';
import { UpdateServiceUseCase } from '../../../../src/application/use-cases/service/update-service.use-case';
import { UpdateServiceStatusUseCase } from '../../../../src/application/use-cases/service/update-service-status.use-case';
import { DeleteServiceUseCase } from '../../../../src/application/use-cases/service/delete-service.use-case';

describe('ServiceController', () => {
  let controller: ServiceController;
  let createServiceUseCase: jest.Mocked<Pick<CreateServiceUseCase, 'execute'>>;
  let findServiceByIdUseCase: jest.Mocked<Pick<FindServiceByIdUseCase, 'execute'>>;
  let findAllServicesPaginatedUseCase: jest.Mocked<
    Pick<FindAllServicesPaginatedUseCase, 'execute'>
  >;
  let updateServiceUseCase: jest.Mocked<Pick<UpdateServiceUseCase, 'execute'>>;
  let updateServiceStatusUseCase: jest.Mocked<Pick<UpdateServiceStatusUseCase, 'execute'>>;
  let deleteServiceUseCase: jest.Mocked<Pick<DeleteServiceUseCase, 'execute'>>;

  beforeEach(() => {
    createServiceUseCase = { execute: jest.fn() };
    findServiceByIdUseCase = { execute: jest.fn() };
    findAllServicesPaginatedUseCase = { execute: jest.fn() };
    updateServiceUseCase = { execute: jest.fn() };
    updateServiceStatusUseCase = { execute: jest.fn() };
    deleteServiceUseCase = { execute: jest.fn() };

    controller = new ServiceController(
      createServiceUseCase as any,
      findServiceByIdUseCase as any,
      findAllServicesPaginatedUseCase as any,
      updateServiceUseCase as any,
      updateServiceStatusUseCase as any,
      deleteServiceUseCase as any,
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

      expect(result).toEqual(createdService);
      expect(createServiceUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('findAll', () => {
    it('should return paginated services with default parameters', async () => {
      const services = [
        createMockService({ id: randomUUID(), name: 'Service 1' }),
        createMockService({ id: randomUUID(), name: 'Service 2' }),
      ];

      const paginatedResult = {
        services,
        totalRecords: 2,
        totalPages: 1,
      };

      findAllServicesPaginatedUseCase.execute.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(1, 10, true);

      expect(result).toEqual({
        data: services,
        totalRecords: 2,
        totalPages: 1,
      });

      expect(findAllServicesPaginatedUseCase.execute).toHaveBeenCalledWith(1, 10, true);
    });
  });

  describe('findById', () => {
    it('should return a service by id', async () => {
      const id = randomUUID();
      const service = createMockService({ id });

      findServiceByIdUseCase.execute.mockResolvedValue(service);

      const result = await controller.findById(id);

      expect(result).toEqual(service);
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
        isActive: true,
      };

      const updatedService = createMockService({
        id,
        name: request.name,
        description: request.description,
        basePrice: request.basePrice,
        estimatedTimeMin: request.estimatedTimeMin,
        isActive: request.isActive,
      });

      updateServiceUseCase.execute.mockResolvedValue(updatedService);

      const result = await controller.update(id, request);

      expect(result).toEqual(updatedService);
      expect(updateServiceUseCase.execute).toHaveBeenCalledWith(id, request);
    });
  });

  describe('updateStatus', () => {
    it('should update service status to inactive', async () => {
      const id = randomUUID();
      const request: UpdateServiceStatusRequestDto = {
        active: false,
      };

      const updatedService = createMockService({
        id,
        isActive: false,
      });

      updateServiceStatusUseCase.execute.mockResolvedValue(updatedService);

      const result = await controller.updateStatus(id, request);

      expect(result).toEqual(updatedService);
      expect(updateServiceStatusUseCase.execute).toHaveBeenCalledWith(id, false);
    });

    it('should update service status to active', async () => {
      const id = randomUUID();
      const request: UpdateServiceStatusRequestDto = {
        active: true,
      };

      const updatedService = createMockService({
        id,
        isActive: true,
      });

      updateServiceStatusUseCase.execute.mockResolvedValue(updatedService);

      const result = await controller.updateStatus(id, request);

      expect(result).toEqual(updatedService);
      expect(updateServiceStatusUseCase.execute).toHaveBeenCalledWith(id, true);
    });
  });

  describe('delete', () => {
    it('should delete a service successfully', async () => {
      const id = randomUUID();

      deleteServiceUseCase.execute.mockResolvedValue(undefined);

      await controller.delete(id);

      expect(deleteServiceUseCase.execute).toHaveBeenCalledWith(id);
      expect(deleteServiceUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
