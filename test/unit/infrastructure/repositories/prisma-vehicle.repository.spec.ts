import { PrismaVehicleRepository } from '@infrastructure/repositories/prisma-vehicle.repository';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { Customer } from '@domain/entities/customer.entity';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { createMockVehicle } from '../../../helpers/vehicle-mock.factory';
import { randomUUID } from 'node:crypto';

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
        createMockVehicle({
          ...vehicle,
          customer: { id: vehicle.customerId, name: 'John' } as unknown as Customer,
        }),
      );

      const result = await repository.create(vehicle);

      expect(result.id).toBe(vehicle.id);
      expect(prisma.vehicle.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a vehicle when found', async () => {
      const id = randomUUID();
      prisma.vehicle.findUnique.mockResolvedValue(
        createMockVehicle({
          id,
          plate: 'ABC-1234',
          customer: { id: randomUUID(), name: 'John' } as unknown as Customer,
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
      prisma.vehicle.findUnique.mockResolvedValue(createMockVehicle({ id: randomUUID(), plate }));

      const result = await repository.findByPlate(plate);

      expect(result).toBeDefined();
      expect(result?.plate).toBe(plate);
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
        createMockVehicle({
          id: randomUUID(),
          customerId,
          customer: { id: customerId, name: 'John' } as unknown as Customer,
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
    it('should update a vehicle with all fields', async () => {
      const id = randomUUID();
      const data: Partial<Vehicle> = {
        customerId: randomUUID(),
        plate: 'XYZ-9999',
        brand: 'Honda',
        model: 'Civic',
        year: 2022,
        color: 'Black',
        mileage: 10000,
      };

      prisma.vehicle.update.mockResolvedValue(
        createMockVehicle({
          id,
          ...data,
          customer: { id: data.customerId, name: 'John' } as unknown as Customer,
        }),
      );

      const result = await repository.update(id, data);

      expect(result.brand).toBe('Honda');
      expect(prisma.vehicle.update).toHaveBeenCalled();
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

  describe('hasWorkOrders', () => {
    it('should return true if vehicle has work orders', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ id: randomUUID() });

      const result = await repository.hasWorkOrders(randomUUID());

      expect(result).toBe(true);
    });

    it('should return false if vehicle has no work orders', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null);

      const result = await repository.hasWorkOrders(randomUUID());

      expect(result).toBe(false);
    });
  });

  describe('findAllByCustomerId', () => {
    it('should return all vehicles for a customer', async () => {
      const customerId = randomUUID();
      const mockVehicles = [
        createMockVehicle({
          customerId,
          customer: { id: customerId, name: 'John' } as unknown as Customer,
        }),
        createMockVehicle({
          customerId,
          customer: { id: customerId, name: 'John' } as unknown as Customer,
        }),
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
