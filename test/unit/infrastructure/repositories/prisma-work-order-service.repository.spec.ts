import { PrismaWorkOrderServiceRepository } from '@infrastructure/repositories/prisma-work-order-service.repository';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { randomUUID } from 'crypto';
import { Prisma } from '@generated/client';

describe('PrismaWorkOrderServiceRepository', () => {
  let repository: PrismaWorkOrderServiceRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaWorkOrderServiceRepository(prisma as any);
  });

  describe('create', () => {
    it('should create a work order service', async () => {
      const wos = WorkOrderService.create({
        workOrderId: randomUUID(),
        serviceId: randomUUID(),
        quantity: 2,
        unitPrice: 100.0,
      });

      prisma.workOrderService.create.mockResolvedValue({
        ...wos,
        unitPrice: new Prisma.Decimal(wos.unitPrice),
        totalPrice: new Prisma.Decimal(wos.totalPrice),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.create(wos);

      expect(result.workOrderId).toBe(wos.workOrderId);
      expect(prisma.workOrderService.create).toHaveBeenCalled();
    });
  });

  describe('findByWorkOrderAndService', () => {
    it('should return item when found', async () => {
      const workOrderId = randomUUID();
      const serviceId = randomUUID();
      prisma.workOrderService.findUnique.mockResolvedValue({
        workOrderId,
        serviceId,
        quantity: 2,
        unitPrice: new Prisma.Decimal(100.0),
        totalPrice: new Prisma.Decimal(200.0),
        status: WorkOrderServiceStatus.PENDING,
      });

      const result = await repository.findByWorkOrderAndService(workOrderId, serviceId);

      expect(result).toBeDefined();
      expect(result?.workOrderId).toBe(workOrderId);
    });

    it('should return null when not found', async () => {
      prisma.workOrderService.findUnique.mockResolvedValue(null);
      const result = await repository.findByWorkOrderAndService(randomUUID(), randomUUID());
      expect(result).toBeNull();
    });
  });

  describe('findByWorkOrderId', () => {
    it('should return items for a work order', async () => {
      const workOrderId = randomUUID();
      prisma.workOrderService.findMany.mockResolvedValue([
        {
          workOrderId,
          serviceId: randomUUID(),
          quantity: 2,
          unitPrice: new Prisma.Decimal(100.0),
          totalPrice: new Prisma.Decimal(200.0),
          status: WorkOrderServiceStatus.PENDING,
        },
      ]);

      const result = await repository.findByWorkOrderId(workOrderId);

      expect(result.length).toBe(1);
    });
  });

  describe('update', () => {
    it('should update a work order service', async () => {
      const wos = WorkOrderService.create({
        workOrderId: randomUUID(),
        serviceId: randomUUID(),
        quantity: 2,
        unitPrice: 100.0,
      });
      wos.status = WorkOrderServiceStatus.IN_PROGRESS;

      prisma.workOrderService.update.mockResolvedValue({
        ...wos,
        unitPrice: new Prisma.Decimal(wos.unitPrice),
        totalPrice: new Prisma.Decimal(wos.totalPrice),
      });

      const result = await repository.update(wos);

      expect(result.status).toBe(WorkOrderServiceStatus.IN_PROGRESS);
      expect(prisma.workOrderService.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an item', async () => {
      const workOrderId = randomUUID();
      const serviceId = randomUUID();
      prisma.workOrderService.delete.mockResolvedValue({ workOrderId, serviceId });

      await repository.delete(workOrderId, serviceId);

      expect(prisma.workOrderService.delete).toHaveBeenCalled();
    });
  });

  describe('isAllCompletedByWorkOrderId', () => {
    it('should return true if no non-completed items', async () => {
      prisma.workOrderService.findFirst.mockResolvedValue(null);

      const result = await repository.isAllCompletedByWorkOrderId(randomUUID());

      expect(result).toBe(true);
    });

    it('should return false if there are non-completed items', async () => {
      prisma.workOrderService.findFirst.mockResolvedValue({ workOrderId: randomUUID() });

      const result = await repository.isAllCompletedByWorkOrderId(randomUUID());

      expect(result).toBe(false);
    });
  });
});
