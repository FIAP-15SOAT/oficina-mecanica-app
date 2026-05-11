import { Prisma } from '@generated/client';
import { PrismaVehicleRepository } from '@infrastructure/repositories/prisma-vehicle.repository';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { createMockPrismaVehicle } from '../../../helpers/vehicle-mock.factory';
import { randomUUID } from 'node:crypto';
import { Plate } from '@domain/value-objects/plate.vo';

describe('PrismaVehicleRepository', () => {
  let repository: PrismaVehicleRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaVehicleRepository(prisma);
  });

  describe('create', () => {
    it('should create a vehicle', async () => {
      const vehicle = Vehicle.create({
        customerId: randomUUID(),
        plate: 'ABC-1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
      });

      prisma.vehicle.create.mockResolvedValue(
        createMockPrismaVehicle({
          id: vehicle.id,
          customerId: vehicle.customerId,
          plate: vehicle.plate.value,
        }),
      );

      const result = await repository.create(vehicle);

      expect(result.id).toBe(vehicle.id);
      expect(prisma.vehicle.create).toHaveBeenCalled();
    });

    it('should throw ResourceConflictException on P2002', async () => {
      const vehicle = Vehicle.create({
        customerId: randomUUID(),
        plate: 'ABC-1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
      });

      const error = new Prisma.PrismaClientKnownRequestError('Duplicate plate', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.vehicle.create.mockRejectedValue(error);

      await expect(repository.create(vehicle)).rejects.toThrow(ResourceConflictException);
    });

    it('should rethrow unexpected errors', async () => {
      const vehicle = Vehicle.create({
        customerId: randomUUID(),
        plate: 'ABC-1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
      });

      const error = new Error('Database connection lost');
      prisma.vehicle.create.mockRejectedValue(error);

      await expect(repository.create(vehicle)).rejects.toThrow('Database connection lost');
    });
  });

  describe('findById', () => {
    it('should return a vehicle when found', async () => {
      const id = randomUUID();
      prisma.vehicle.findUnique.mockResolvedValue(
        createMockPrismaVehicle({
          id,
          plate: 'ABC1234',
        }),
      );

      const result = await repository.findById(id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
    });

    it('should return null when not found', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);
      const result = await repository.findById(randomUUID());
      expect(result).toBeNull();
    });
  });

  describe('findByPlate', () => {
    it('should return a vehicle when found', async () => {
      const plate = 'ABC-1234';
      prisma.vehicle.findUnique.mockResolvedValue(
        createMockPrismaVehicle({ id: randomUUID(), plate: 'ABC1234' }),
      );

      const result = await repository.findByPlate(plate);

      expect(result).toBeDefined();
      expect(result?.plate.value).toBe('ABC1234');
    });

    it('should return null when not found', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);
      const result = await repository.findByPlate('XYZ-9999');
      expect(result).toBeNull();
    });
  });

  describe('findAllPaginated', () => {
    it('should filter by customerId', async () => {
      const customerId = randomUUID();
      prisma.vehicle.findMany.mockResolvedValue([
        createMockPrismaVehicle({
          id: randomUUID(),
          customerId,
        }),
      ]);
      prisma.vehicle.count.mockResolvedValue(1);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, { customerId });

      expect(result.total).toBe(1);
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ customerId }) }),
      );
    });

    it('should filter by brand and plate', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);
      prisma.vehicle.count.mockResolvedValue(0);

      await repository.findAllPaginated(
        { page: 1, limit: 10 },
        { brand: 'Toyota', plate: 'ABC-1234' },
      );

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            brand: { contains: 'Toyota', mode: 'insensitive' },
            plate: 'ABC-1234',
          },
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a vehicle and return domain entity', async () => {
      const vehicle = Vehicle.reconstitute({
        id: randomUUID(),
        customerId: randomUUID(),
        plate: Plate.create('XYZ-9999'),
        brand: 'Honda',
        model: 'Civic',
        year: 2022,
        color: 'Black',
        mileage: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.vehicle.update.mockResolvedValue(
        createMockPrismaVehicle({
          id: vehicle.id,
          customerId: vehicle.customerId,
          plate: vehicle.plate.value,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          mileage: vehicle.mileage,
        }),
      );

      const result = await repository.update(vehicle);

      expect(result.brand).toBe('Honda');
      expect(prisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: vehicle.id },
        data: {
          customerId: vehicle.customerId,
          plate: vehicle.plate.value,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          mileage: vehicle.mileage,
        },
        include: { customer: true },
      });
    });

    it('should throw ResourceConflictException on P2002', async () => {
      const vehicle = Vehicle.reconstitute({
        id: randomUUID(),
        customerId: randomUUID(),
        plate: Plate.create('XYZ-9999'),
        brand: 'Honda',
        model: 'Civic',
        year: 2022,
        color: null,
        mileage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const error = new Prisma.PrismaClientKnownRequestError('Duplicate plate', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.vehicle.update.mockRejectedValue(error);

      await expect(repository.update(vehicle)).rejects.toThrow(ResourceConflictException);
    });

    it('should rethrow unexpected errors from update', async () => {
      const vehicle = Vehicle.reconstitute({
        id: randomUUID(),
        customerId: randomUUID(),
        plate: Plate.create('ABC-1234'),
        brand: 'Test',
        model: 'Model',
        year: 2020,
        color: null,
        mileage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const unexpectedError = new Error('Database connection lost');
      prisma.vehicle.update.mockRejectedValue(unexpectedError);

      await expect(repository.update(vehicle)).rejects.toThrow('Database connection lost');
    });
  });

  describe('delete', () => {
    it('should delete a vehicle', async () => {
      const id = randomUUID();
      prisma.vehicle.delete.mockResolvedValue({ id });

      await repository.delete(id);

      expect(prisma.vehicle.delete).toHaveBeenCalledWith({ where: { id } });
    });
  });

  describe('isVehicleInUse', () => {
    it('should return true if vehicle has work orders', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: 'some-id' });

      const result = await repository.isVehicleInUse(randomUUID());

      expect(result).toBe(true);
    });

    it('should return false if vehicle has no work orders', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      const result = await repository.isVehicleInUse(randomUUID());

      expect(result).toBe(false);
    });
  });

  describe('findAllByCustomerId', () => {
    it('should return all vehicles for a customer', async () => {
      const customerId = randomUUID();
      const mockVehicles = [
        createMockPrismaVehicle({ customerId }),
        createMockPrismaVehicle({ customerId }),
      ];
      prisma.vehicle.findMany.mockResolvedValue(mockVehicles);

      const result = await repository.findAllByCustomerId(customerId);

      expect(result).toHaveLength(2);
      expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        include: { customer: true },
      });
    });

    it('should return empty array when customer has no vehicles', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);
      const result = await repository.findAllByCustomerId(randomUUID());
      expect(result).toEqual([]);
    });
  });
});
