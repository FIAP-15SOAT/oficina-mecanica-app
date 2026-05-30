import { PrismaWorkOrderRepository } from '@infrastructure/repositories/prisma-work-order.repository';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { randomUUID } from 'node:crypto';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { Prisma } from '@generated/client';

describe('PrismaWorkOrderRepository', () => {
  let repository: PrismaWorkOrderRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaWorkOrderRepository(prisma);
  });

  describe('create', () => {
    it('should create a work order', async () => {
      const workOrder = WorkOrder.create({
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
      });

      prisma.workOrder.create.mockResolvedValue({
        ...workOrder,
        status: workOrder.status,
        totalAmount: workOrder.totalAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.create(workOrder);

      expect(result.id).toBe(workOrder.id);
      expect(prisma.workOrder.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a work order when found (without services/partSupplies)', async () => {
      const id = randomUUID();
      prisma.workOrder.findUnique.mockResolvedValue({ id, number: '000001' });

      const result = await repository.findById(id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
      expect(prisma.workOrder.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          include: expect.not.objectContaining({ services: expect.anything() }),
        }),
      );
    });

    it('should return null when not found', async () => {
      prisma.workOrder.findUnique.mockResolvedValue(null);
      const result = await repository.findById(randomUUID());
      expect(result).toBeNull();
    });
  });

  describe('findByIdWithDetails', () => {
    it('should return a work order with relations when found', async () => {
      const id = randomUUID();
      prisma.workOrder.findUnique.mockResolvedValue({ id, number: '000001' });

      const result = await repository.findByIdWithDetails(id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
      expect(prisma.workOrder.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          include: expect.objectContaining({ services: expect.anything() }),
        }),
      );
    });

    it('should return null when not found', async () => {
      prisma.workOrder.findUnique.mockResolvedValue(null);
      const result = await repository.findByIdWithDetails(randomUUID());
      expect(result).toBeNull();
    });
  });

  describe('findAllPaginated', () => {
    it('should return results ordered by status priority (IN_PROGRESS before AWAITING_APPROVAL)', async () => {
      const idInProgress = randomUUID();
      const idAwaiting = randomUUID();

      prisma.$queryRaw.mockResolvedValue([{ id: idInProgress }, { id: idAwaiting }]);
      prisma.workOrder.count.mockResolvedValue(2);
      // findMany retorna fora de ordem — o repositório deve reordenar
      prisma.workOrder.findMany.mockResolvedValue([
        { id: idAwaiting, number: '000002', status: WorkOrderStatus.AWAITING_APPROVAL, createdAt: new Date() },
        { id: idInProgress, number: '000001', status: WorkOrderStatus.IN_PROGRESS, createdAt: new Date() },
      ]);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

      expect(result.total).toBe(2);
      expect(result.items[0]).toMatchObject({ id: idInProgress });
      expect(result.items[1]).toMatchObject({ id: idAwaiting });
    });

    it('should call $queryRaw for ordered IDs', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      await repository.findAllPaginated({ page: 1, limit: 10 }, {});

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return empty list when no results', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(prisma.workOrder.findMany).not.toHaveBeenCalled();
    });

    it('should filter by customerId', async () => {
      const customerId = randomUUID();
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, { customerId });

      expect(result.total).toBe(0);
      expect(prisma.workOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ customerId }) }),
      );
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should filter by vehicleId', async () => {
      const vehicleId = randomUUID();
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, { vehicleId });

      expect(result.total).toBe(0);
      expect(prisma.workOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ vehicleId }) }),
      );
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should apply extra filters', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      const assignedUserId = randomUUID();
      await repository.findAllPaginated(
        { page: 1, limit: 10 },
        {
          number: '001',
          assignedUserId,
          status: WorkOrderStatus.IN_PROGRESS,
        },
      );

      expect(prisma.workOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            number: { contains: '001', mode: 'insensitive' },
            assignedUserId,
            status: WorkOrderStatus.IN_PROGRESS,
          }),
        }),
      );
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should pass customerId filter value into $queryRaw', async () => {
      const customerId = randomUUID();
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.workOrder.count.mockResolvedValue(0);

      await repository.findAllPaginated({ page: 1, limit: 10 }, { customerId });

      const rawCall = prisma.$queryRaw.mock.calls[0][0] as { values: unknown[] };
      expect(rawCall.values).toContain(customerId);
    });
  });

  describe('update', () => {
    it('should update a work order using optimistic locking', async () => {
      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        number: '001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: randomUUID(),
        status: WorkOrderStatus.COMPLETED,
        problemDescription: 'Problem',
        internalNotes: 'Notes',
        mileageAtService: 50000,
        totalAmount: 500,
        version: 1,
        approvedAt: new Date(),
        rejectedAt: null,
        startedAt: new Date(),
        finishedAt: new Date(),
        deliveredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.workOrder.update.mockResolvedValue({
        ...workOrder,
        status: workOrder.status,
        totalAmount: workOrder.totalAmount,
        version: 2,
      });

      const result = await repository.update(workOrder);

      expect(result.status).toBe(WorkOrderStatus.COMPLETED);
      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: workOrder.id, version: 1 } }),
      );
    });

    it('should throw ConcurrencyException when work order was modified concurrently', async () => {
      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        number: '001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.RECEIVED,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 1,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.workOrder.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.0.0',
        }),
      );

      await expect(repository.update(workOrder)).rejects.toThrow(ConcurrencyException);
    });

    it('should rethrow unexpected errors from update', async () => {
      const workOrder = WorkOrder.reconstitute({
        id: randomUUID(),
        number: '001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.RECEIVED,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 1,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.workOrder.update.mockRejectedValue(new Error('Database connection lost'));

      await expect(repository.update(workOrder)).rejects.toThrow('Database connection lost');
    });
  });

  describe('generateNextNumber', () => {
    it('should return the next padded value from the sequence', async () => {
      prisma.$queryRaw.mockResolvedValue([{ next: 1n }]);

      const result = await repository.generateNextNumber();

      expect(result).toBe('000001');
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should pad larger sequence values to 6 digits', async () => {
      prisma.$queryRaw.mockResolvedValue([{ next: 42n }]);

      const result = await repository.generateNextNumber();

      expect(result).toBe('000042');
    });
  });

  describe('addServiceItems', () => {
    it('should call workOrderService.createMany with mapped data', async () => {
      const workOrder = WorkOrder.create({
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
      });
      const item = WorkOrderService.create({
        workOrderId: workOrder.id,
        serviceId: randomUUID(),
        quantity: 1,
        unitPrice: 100,
      });

      prisma.workOrderService.createMany.mockResolvedValue({ count: 1 });

      await repository.addServiceItems([item]);

      expect(prisma.workOrderService.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ workOrderId: workOrder.id })]),
        }),
      );
    });

    it('should throw ConcurrencyException on P2002 (duplicate service item)', async () => {
      const workOrder = WorkOrder.create({
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
      });
      const item = WorkOrderService.create({
        workOrderId: workOrder.id,
        serviceId: randomUUID(),
        quantity: 1,
        unitPrice: 100,
      });

      prisma.workOrderService.createMany.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.0.0',
        }),
      );

      await expect(repository.addServiceItems([item])).rejects.toThrow(ResourceConflictException);
    });

    it('should rethrow unexpected errors from addServiceItems', async () => {
      const workOrder = WorkOrder.create({
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
      });
      const item = WorkOrderService.create({
        workOrderId: workOrder.id,
        serviceId: randomUUID(),
        quantity: 1,
        unitPrice: 100,
      });

      prisma.workOrderService.createMany.mockRejectedValue(new Error('Database connection lost'));

      await expect(repository.addServiceItems([item])).rejects.toThrow('Database connection lost');
    });
  });

  describe('updateServiceItemStatus', () => {
    it('should atomically update service item and work order root', async () => {
      const workOrderId = randomUUID();
      const serviceId = randomUUID();
      const workOrder = WorkOrder.reconstitute({
        id: workOrderId,
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.IN_PROGRESS,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 2,
        approvedAt: null,
        rejectedAt: null,
        startedAt: new Date(),
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const item = WorkOrderService.create({
        workOrderId,
        serviceId,
        quantity: 1,
        unitPrice: 100,
      });
      item.startService();

      prisma.workOrderService.update.mockResolvedValue({});
      prisma.workOrder.update.mockResolvedValue({});

      await repository.updateServiceItemStatus(workOrder, item);

      expect(prisma.workOrderService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workOrderId_serviceId: expect.objectContaining({ serviceId }),
          }),
          data: expect.objectContaining({ status: item.status }),
        }),
      );
      expect(prisma.workOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: workOrderId, version: 2 },
          data: expect.objectContaining({ version: { increment: 1 } }),
        }),
      );
    });

    it('should throw ConcurrencyException on P2025 during atomic update', async () => {
      const workOrderId = randomUUID();
      const workOrder = WorkOrder.reconstitute({
        id: workOrderId,
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.IN_PROGRESS,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 1,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const item = WorkOrderService.create({
        workOrderId,
        serviceId: randomUUID(),
        quantity: 1,
        unitPrice: 100,
      });

      prisma.workOrder.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '5.0.0',
        }),
      );
      prisma.workOrderService.update.mockResolvedValue({});

      await expect(repository.updateServiceItemStatus(workOrder, item)).rejects.toThrow(
        ConcurrencyException,
      );
    });

    it('should rethrow unexpected errors from atomic update', async () => {
      const workOrderId = randomUUID();
      const workOrder = WorkOrder.reconstitute({
        id: workOrderId,
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
        assignedUserId: null,
        status: WorkOrderStatus.IN_PROGRESS,
        problemDescription: null,
        internalNotes: null,
        mileageAtService: null,
        totalAmount: 0,
        version: 1,
        approvedAt: null,
        rejectedAt: null,
        startedAt: null,
        finishedAt: null,
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const item = WorkOrderService.create({
        workOrderId,
        serviceId: randomUUID(),
        quantity: 1,
        unitPrice: 100,
      });

      prisma.workOrderService.update.mockRejectedValue(new Error('Unexpected DB error'));
      prisma.workOrder.update.mockResolvedValue({});

      await expect(repository.updateServiceItemStatus(workOrder, item)).rejects.toThrow(
        'Unexpected DB error',
      );
    });
  });

  describe('addPartSupplyItems', () => {
    it('should call workOrderPartSupply.createMany with mapped data', async () => {
      const workOrder = WorkOrder.create({
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
      });
      const item = WorkOrderPartSupply.create({
        workOrderId: workOrder.id,
        partSupplyId: randomUUID(),
        quantity: 2,
        unitPrice: 50,
      });

      prisma.workOrderPartSupply.createMany.mockResolvedValue({ count: 1 });

      await repository.addPartSupplyItems([item]);

      expect(prisma.workOrderPartSupply.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ workOrderId: workOrder.id })]),
        }),
      );
    });

    it('should throw ConcurrencyException on P2002 (duplicate part supply item)', async () => {
      const workOrder = WorkOrder.create({
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
      });
      const item = WorkOrderPartSupply.create({
        workOrderId: workOrder.id,
        partSupplyId: randomUUID(),
        quantity: 2,
        unitPrice: 50,
      });

      prisma.workOrderPartSupply.createMany.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.0.0',
        }),
      );

      await expect(repository.addPartSupplyItems([item])).rejects.toThrow(
        ResourceConflictException,
      );
    });

    it('should rethrow unexpected errors from addPartSupplyItems', async () => {
      const workOrder = WorkOrder.create({
        number: '000001',
        customerId: randomUUID(),
        vehicleId: randomUUID(),
      });
      const item = WorkOrderPartSupply.create({
        workOrderId: workOrder.id,
        partSupplyId: randomUUID(),
        quantity: 2,
        unitPrice: 50,
      });

      prisma.workOrderPartSupply.createMany.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(repository.addPartSupplyItems([item])).rejects.toThrow(
        'Database connection lost',
      );
    });
  });
});
