import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/client';
import { Service } from '@domain/entities/service.entity';
import { PrismaServiceRepository } from '@infrastructure/repositories/prisma-service.repository';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';

import { createMockService } from '../../../helpers/service-mock.factory';

describe('PrismaServiceRepository', () => {
  let repository: PrismaServiceRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaServiceRepository(prisma);
  });

  describe('create', () => {
    it('should create a service and return domain entity', async () => {
      const service = Service.create({
        name: 'Tire Rotation',
        description: 'Complete tire rotation service',
        basePrice: 49.99,
        estimatedTimeMin: 20,
      });

      const prismaModel = createMockService({
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        estimatedTimeMin: service.estimatedTimeMin,
      });

      prisma.service.create.mockResolvedValue(prismaModel);

      const result = await repository.create(service);

      expect(result).toEqual(
        Service.reconstitute({
          id: prismaModel.id,
          name: prismaModel.name,
          description: prismaModel.description,
          basePrice: Number(prismaModel.basePrice),
          estimatedTimeMin: prismaModel.estimatedTimeMin,
          createdAt: prismaModel.createdAt,
          updatedAt: prismaModel.updatedAt,
        }),
      );

      expect(prisma.service.create).toHaveBeenCalledWith({
        data: {
          name: service.name,
          description: service.description,
          basePrice: service.basePrice,
          estimatedTimeMin: service.estimatedTimeMin,
        },
      });
    });

    it('should throw ResourceConflictException when service already exists', async () => {
      const service = createMockService();
      const error = new Prisma.PrismaClientKnownRequestError('Duplicate Service', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.service.create.mockRejectedValue(error);

      await expect(repository.create(service)).rejects.toThrow('Serviço já cadastrado');
    });

    it('should rethrow unknown errors', async () => {
      const service = createMockService();
      const error = new Error('Database connection failed');
      prisma.service.create.mockRejectedValue(error);

      await expect(repository.create(service)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    it('should find a service by id and return domain entity', async () => {
      const id = randomUUID();
      const prismaModel = createMockService({ id });

      prisma.service.findUnique.mockResolvedValue(prismaModel);

      const result = await repository.findById(id);

      expect(result).toEqual(
        Service.reconstitute({
          id: prismaModel.id,
          name: prismaModel.name,
          description: prismaModel.description,
          basePrice: Number(prismaModel.basePrice),
          estimatedTimeMin: prismaModel.estimatedTimeMin,
          createdAt: prismaModel.createdAt,
          updatedAt: prismaModel.updatedAt,
        }),
      );

      expect(prisma.service.findUnique).toHaveBeenCalledWith({ where: { id } });
    });

    it('should return null when service is not found', async () => {
      const id = randomUUID();

      prisma.service.findUnique.mockResolvedValue(null);

      const result = await repository.findById(id);

      expect(result).toBeNull();
      expect(prisma.service.findUnique).toHaveBeenCalledWith({ where: { id } });
    });
  });

  describe('findByName', () => {
    it('should find a service by name and return domain entity', async () => {
      const name = 'Oil Change';
      const prismaModel = createMockService({ name });

      prisma.service.findFirst.mockResolvedValue(prismaModel);

      const result = await repository.findByName(name);

      expect(result).toEqual(
        Service.reconstitute({
          id: prismaModel.id,
          name: prismaModel.name,
          description: prismaModel.description,
          basePrice: Number(prismaModel.basePrice),
          estimatedTimeMin: prismaModel.estimatedTimeMin,
          createdAt: prismaModel.createdAt,
          updatedAt: prismaModel.updatedAt,
        }),
      );

      expect(prisma.service.findFirst).toHaveBeenCalledWith({ where: { name } });
    });

    it('should return null when service is not found', async () => {
      const name = 'Non-existent Service';

      prisma.service.findFirst.mockResolvedValue(null);

      const result = await repository.findByName(name);

      expect(result).toBeNull();
      expect(prisma.service.findFirst).toHaveBeenCalledWith({ where: { name } });
    });
  });

  describe('findAllPaginated', () => {
    it('should return all services when active is not provided', async () => {
      const page = 1;
      const pageSize = 10;
      const prismaModels = [
        createMockService({ id: randomUUID(), name: 'Service 1' }),
        createMockService({ id: randomUUID(), name: 'Service 2' }),
      ];

      prisma.service.findMany.mockResolvedValue(prismaModels);
      prisma.service.count.mockResolvedValue(2);

      const result = await repository.findAllPaginated({ page, limit: pageSize }, {});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0]).toEqual(
        Service.reconstitute({
          id: prismaModels[0].id,
          name: prismaModels[0].name,
          description: prismaModels[0].description,
          basePrice: Number(prismaModels[0].basePrice),
          estimatedTimeMin: prismaModels[0].estimatedTimeMin,
          createdAt: prismaModels[0].createdAt,
          updatedAt: prismaModels[0].updatedAt,
        }),
      );

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        where: {},
      });

      expect(prisma.service.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should handle pagination correctly for second page', async () => {
      const page = 2;
      const pageSize = 10;

      prisma.service.findMany.mockResolvedValue([]);
      prisma.service.count.mockResolvedValue(0);

      await repository.findAllPaginated({ page, limit: pageSize }, {});

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        where: {},
      });
    });

    it('should filter by name using case-insensitive contains', async () => {
      const page = 1;
      const pageSize = 10;
      const prismaModels = [createMockService({ name: 'Oil Change' })];

      prisma.service.findMany.mockResolvedValue(prismaModels);
      prisma.service.count.mockResolvedValue(1);

      const result = await repository.findAllPaginated({ page, limit: pageSize }, { name: 'oil' });

      expect(result.items).toHaveLength(1);
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        where: { name: { contains: 'oil', mode: 'insensitive' } },
      });

      expect(prisma.service.count).toHaveBeenCalledWith({
        where: { name: { contains: 'oil', mode: 'insensitive' } },
      });
    });
  });

  describe('update', () => {
    it('should update a service with all fields', async () => {
      const id = randomUUID();
      const updateData = {
        name: 'Updated Service',
        description: 'New Description',
        basePrice: 149.99,
        estimatedTimeMin: 60,
      };

      const updatedPrismaModel = createMockService({
        id,
        name: updateData.name,
        description: updateData.description,
        basePrice: updateData.basePrice,
        estimatedTimeMin: updateData.estimatedTimeMin,
      });

      prisma.service.update.mockResolvedValue(updatedPrismaModel);

      const result = await repository.update(id, updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id },
        data: updateData,
      });
    });
  });

  describe('delete', () => {
    it('should delete a service', async () => {
      const id = randomUUID();

      prisma.service.delete.mockResolvedValue(createMockService({ id }));

      await repository.delete(id);

      expect(prisma.service.delete).toHaveBeenCalledWith({ where: { id } });
    });
  });

  describe('isServiceInUse', () => {
    it('should return true when service is referenced by a work order', async () => {
      const id = randomUUID();
      prisma.workOrderService.findFirst.mockResolvedValue({ createdAt: new Date() });
      prisma.quoteService.findFirst.mockResolvedValue(null);

      const result = await repository.isServiceInUse(id);

      expect(result).toBe(true);
      expect(prisma.workOrderService.findFirst).toHaveBeenCalledWith({
        where: { serviceId: id },
        select: { createdAt: true },
      });
    });

    it('should return true when service is referenced by a quote', async () => {
      const id = randomUUID();
      prisma.workOrderService.findFirst.mockResolvedValue(null);
      prisma.quoteService.findFirst.mockResolvedValue({ createdAt: new Date() });

      const result = await repository.isServiceInUse(id);

      expect(result).toBe(true);
    });

    it('should return false when no references exist', async () => {
      const id = randomUUID();
      prisma.workOrderService.findFirst.mockResolvedValue(null);
      prisma.quoteService.findFirst.mockResolvedValue(null);

      const result = await repository.isServiceInUse(id);

      expect(result).toBe(false);
    });
  });

  describe('findServiceMetrics', () => {
    it('should return metrics for a service', async () => {
      const id = randomUUID();
      const mockRow = {
        service_id: id,
        service_name: 'Test Service',
        execution_count: 5n,
        avg_minutes: 30.5,
      };

      prisma.$queryRaw.mockResolvedValue([mockRow]);

      const result = await repository.findServiceMetrics(id);

      expect(result).toEqual({
        serviceId: id,
        serviceName: 'Test Service',
        executionCount: 5,
        averageTimeMinutes: 30.5,
      });
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should round averageTimeMinutes to 2 decimal places', async () => {
      const id = randomUUID();
      prisma.$queryRaw.mockResolvedValue([
        {
          service_id: id,
          service_name: 'Test Service',
          execution_count: 3n,
          avg_minutes: 30.567,
        },
      ]);

      const result = await repository.findServiceMetrics(id);

      expect(result.averageTimeMinutes).toBe(30.57);
    });

    it('should convert Decimal-like object to number for averageTimeMinutes', async () => {
      const id = randomUUID();
      const decimalLike = { valueOf: () => 45.999, toString: () => '45.999' };
      prisma.$queryRaw.mockResolvedValue([
        {
          service_id: id,
          service_name: 'Test Service',
          execution_count: 2n,
          avg_minutes: decimalLike,
        },
      ]);

      const result = await repository.findServiceMetrics(id);

      expect(result.averageTimeMinutes).toBe(46.0);
    });

    it('should return null averageTimeMinutes when avg_minutes is null', async () => {
      const id = randomUUID();
      prisma.$queryRaw.mockResolvedValue([
        {
          service_id: id,
          service_name: 'Test Service',
          execution_count: 0n,
          avg_minutes: null,
        },
      ]);

      const result = await repository.findServiceMetrics(id);

      expect(result.averageTimeMinutes).toBeNull();
    });

    it('should throw DatabaseOperationException if service not found', async () => {
      const id = randomUUID();
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(repository.findServiceMetrics(id)).rejects.toThrow();
    });
  });

  describe('findAllServicesMetrics', () => {
    it('should return paginated metrics for all services', async () => {
      const mockRow = {
        service_id: randomUUID(),
        service_name: 'Test Service',
        execution_count: 10n,
        avg_minutes: 45.0,
      };

      prisma.$queryRaw.mockResolvedValue([mockRow]);
      prisma.service.count.mockResolvedValue(1);

      const result = await repository.findAllServicesMetrics({ page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        serviceId: mockRow.service_id,
        serviceName: 'Test Service',
        executionCount: 10,
        averageTimeMinutes: 45.0,
      });
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.service.count).toHaveBeenCalled();
    });

    it('should round averageTimeMinutes to 2 decimal places', async () => {
      const mockRow = {
        service_id: randomUUID(),
        service_name: 'Test Service',
        execution_count: 4n,
        avg_minutes: 12.3456,
      };

      prisma.$queryRaw.mockResolvedValue([mockRow]);
      prisma.service.count.mockResolvedValue(1);

      const result = await repository.findAllServicesMetrics({ page: 1, limit: 10 });

      expect(result.items[0].averageTimeMinutes).toBe(12.35);
    });

    it('should return null averageTimeMinutes when avg_minutes is null', async () => {
      const mockRow = {
        service_id: randomUUID(),
        service_name: 'Test Service',
        execution_count: 0n,
        avg_minutes: null,
      };

      prisma.$queryRaw.mockResolvedValue([mockRow]);
      prisma.service.count.mockResolvedValue(1);

      const result = await repository.findAllServicesMetrics({ page: 1, limit: 10 });

      expect(result.items[0].averageTimeMinutes).toBeNull();
    });
  });
});
