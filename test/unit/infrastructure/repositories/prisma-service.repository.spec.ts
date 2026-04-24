import { randomUUID } from 'crypto';
import { Service as PrismaServiceModel, Prisma } from '@generated/client';
import { Service } from '@domain/entities/service.entity';
import { PrismaServiceRepository } from '@infrastructure/repositories/prisma-service.repository';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';

function createMockPrismaService(overrides: Partial<PrismaServiceModel> = {}): PrismaServiceModel {
  const now = new Date();
  const id = randomUUID();

  return {
    id,
    name: 'Oil Change',
    description: 'Full engine oil change',
    basePrice: new Prisma.Decimal(99.99),
    estimatedTimeMin: 30,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

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

      const prismaModel = createMockPrismaService({
        name: service.name,
        description: service.description,
        basePrice: new Prisma.Decimal(service.basePrice),
        estimatedTimeMin: service.estimatedTimeMin,
        isActive: service.isActive,
      });

      prisma.service.create.mockResolvedValue(prismaModel);

      const result = await repository.create(service);

      expect(result).toEqual(
        new Service({
          id: prismaModel.id,
          name: prismaModel.name,
          description: prismaModel.description,
          basePrice: Number(prismaModel.basePrice),
          estimatedTimeMin: prismaModel.estimatedTimeMin,
          isActive: prismaModel.isActive,
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
          isActive: service.isActive,
        },
      });
    });
  });

  describe('findById', () => {
    it('should find a service by id and return domain entity', async () => {
      const id = randomUUID();
      const prismaModel = createMockPrismaService({ id });

      prisma.service.findUnique.mockResolvedValue(prismaModel);

      const result = await repository.findById(id);

      expect(result).toEqual(
        new Service({
          id: prismaModel.id,
          name: prismaModel.name,
          description: prismaModel.description,
          basePrice: Number(prismaModel.basePrice),
          estimatedTimeMin: prismaModel.estimatedTimeMin,
          isActive: prismaModel.isActive,
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
      const prismaModel = createMockPrismaService({ name });

      prisma.service.findFirst.mockResolvedValue(prismaModel);

      const result = await repository.findByName(name);

      expect(result).toEqual(
        new Service({
          id: prismaModel.id,
          name: prismaModel.name,
          description: prismaModel.description,
          basePrice: Number(prismaModel.basePrice),
          estimatedTimeMin: prismaModel.estimatedTimeMin,
          isActive: prismaModel.isActive,
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
        createMockPrismaService({ id: randomUUID(), name: 'Service 1' }),
        createMockPrismaService({ id: randomUUID(), name: 'Service 2' }),
      ];

      prisma.service.findMany.mockResolvedValue(prismaModels);
      prisma.service.count.mockResolvedValue(2);

      const result = await repository.findAllPaginated({ page, limit: pageSize });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0]).toEqual(
        new Service({
          id: prismaModels[0].id,
          name: prismaModels[0].name,
          description: prismaModels[0].description,
          basePrice: Number(prismaModels[0].basePrice),
          estimatedTimeMin: prismaModels[0].estimatedTimeMin,
          isActive: prismaModels[0].isActive,
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

    it('should return only active services when active is true', async () => {
      const page = 1;
      const pageSize = 10;
      const prismaModels = [
        createMockPrismaService({ id: randomUUID(), name: 'Service 1', isActive: true }),
        createMockPrismaService({ id: randomUUID(), name: 'Service 2', isActive: true }),
      ];

      prisma.service.findMany.mockResolvedValue(prismaModels);
      prisma.service.count.mockResolvedValue(2);

      const result = await repository.findAllPaginated({ page, limit: pageSize, active: true });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        where: { isActive: true },
      });

      expect(prisma.service.count).toHaveBeenCalledWith({ where: { isActive: true } });
    });

    it('should return only inactive services when active is false', async () => {
      const page = 1;
      const pageSize = 10;
      const prismaModels = [
        createMockPrismaService({ id: randomUUID(), isActive: false }),
        createMockPrismaService({ id: randomUUID(), isActive: false }),
      ];

      prisma.service.findMany.mockResolvedValue(prismaModels);
      prisma.service.count.mockResolvedValue(2);

      const result = await repository.findAllPaginated({ page, limit: pageSize, active: false });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        where: { isActive: false },
      });

      expect(prisma.service.count).toHaveBeenCalledWith({
        where: { isActive: false },
      });
    });

    it('should handle pagination correctly for second page', async () => {
      const page = 2;
      const pageSize = 10;

      prisma.service.findMany.mockResolvedValue([]);
      prisma.service.count.mockResolvedValue(0);

      await repository.findAllPaginated({ page, limit: pageSize });

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
      const prismaModels = [createMockPrismaService({ name: 'Oil Change' })];

      prisma.service.findMany.mockResolvedValue(prismaModels);
      prisma.service.count.mockResolvedValue(1);

      const result = await repository.findAllPaginated({ page, limit: pageSize, name: 'oil' });

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
    it('should update a service and return domain entity', async () => {
      const id = randomUUID();
      const updateData = {
        name: 'Updated Service',
        basePrice: 149.99,
      };

      const updatedPrismaModel = createMockPrismaService({
        id,
        name: updateData.name,
        basePrice: new Prisma.Decimal(updateData.basePrice),
      });

      prisma.service.update.mockResolvedValue(updatedPrismaModel);

      const result = await repository.update(id, updateData);

      expect(result).toEqual(
        new Service({
          id: updatedPrismaModel.id,
          name: updatedPrismaModel.name,
          description: updatedPrismaModel.description,
          basePrice: Number(updatedPrismaModel.basePrice),
          estimatedTimeMin: updatedPrismaModel.estimatedTimeMin,
          isActive: updatedPrismaModel.isActive,
          createdAt: updatedPrismaModel.createdAt,
          updatedAt: updatedPrismaModel.updatedAt,
        }),
      );

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id },
        data: updateData,
      });
    });
  });

  describe('delete', () => {
    it('should delete a service', async () => {
      const id = randomUUID();

      prisma.service.delete.mockResolvedValue(createMockPrismaService({ id }));

      await repository.delete(id);

      expect(prisma.service.delete).toHaveBeenCalledWith({ where: { id } });
    });
  });
});
