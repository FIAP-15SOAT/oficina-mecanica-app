import { PrismaWorkOrderRepository } from '@infrastructure/repositories/prisma-work-order.repository';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { randomUUID } from 'crypto';

describe('PrismaWorkOrderRepository', () => {
  let repository: PrismaWorkOrderRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaWorkOrderRepository(prisma as any);
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.create(workOrder);

      expect(result.id).toBe(workOrder.id);
      expect(prisma.workOrder.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a work order when found', async () => {
      const id = randomUUID();
      prisma.workOrder.findUnique.mockResolvedValue({ id, number: '000001' });

      const result = await repository.findById(id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(id);
    });

    it('should return null when not found', async () => {
      prisma.workOrder.findUnique.mockResolvedValue(null);
      const result = await repository.findById(randomUUID());
      expect(result).toBeNull();
    });
  });


  describe('findAllPaginated', () => {
    it('should filter by customerId', async () => {
      const customerId = randomUUID();
      prisma.workOrder.findMany.mockResolvedValue([{ id: randomUUID(), customerId }]);
      prisma.workOrder.count.mockResolvedValue(1);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, { customerId });

      expect(result.total).toBe(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ customerId }) }),
      );
    });

    it('should filter by vehicleId', async () => {
      const vehicleId = randomUUID();
      prisma.workOrder.findMany.mockResolvedValue([{ id: randomUUID(), vehicleId }]);
      prisma.workOrder.count.mockResolvedValue(1);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, { vehicleId });

      expect(result.total).toBe(1);
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ vehicleId }) }),
      );
    });

    it('should apply extra filters', async () => {
      prisma.workOrder.findMany.mockResolvedValue([]);
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

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            number: { contains: '001', mode: 'insensitive' },
            assignedUserId,
            status: WorkOrderStatus.IN_PROGRESS,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a work order with all fields', async () => {
      const workOrder = new WorkOrder({
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
        approvedAt: new Date(),
        rejectedAt: null,
        startedAt: new Date(),
        finishedAt: new Date(),
        deliveredAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.workOrder.update.mockResolvedValue({
        ...workOrder,
      });

      const result = await repository.update(workOrder);

      expect(result.status).toBe(WorkOrderStatus.COMPLETED);
      expect(prisma.workOrder.update).toHaveBeenCalled();
    });
  });

  describe('generateNextNumber', () => {
    it('should return 000001 when count is 0', async () => {
      prisma.workOrder.count.mockResolvedValue(0);

      const result = await repository.generateNextNumber();

      expect(result).toBe('000001');
    });

    it('should increment the current count', async () => {
      prisma.workOrder.count.mockResolvedValue(5);

      const result = await repository.generateNextNumber();

      expect(result).toBe('000006');
    });
  });
});
