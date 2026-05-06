import { PrismaWorkOrderRepository } from '@infrastructure/repositories/prisma-work-order.repository';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { randomUUID } from 'node:crypto';

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
      });

      const result = await repository.update(workOrder);

      expect(result.status).toBe(WorkOrderStatus.COMPLETED);
      expect(prisma.workOrder.update).toHaveBeenCalled();
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
  });

  describe('updateServiceItemStatus', () => {
    it('should call workOrderService.update with service status fields', async () => {
      const serviceId = randomUUID();
      const item = WorkOrderService.create({
        workOrderId: randomUUID(),
        serviceId,
        quantity: 1,
        unitPrice: 100,
      });
      item.startService();

      prisma.workOrderService.update.mockResolvedValue({});

      await repository.updateServiceItemStatus(item);

      expect(prisma.workOrderService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workOrderId_serviceId: expect.objectContaining({ serviceId }),
          }),
          data: expect.objectContaining({ status: item.status }),
        }),
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
  });
});
