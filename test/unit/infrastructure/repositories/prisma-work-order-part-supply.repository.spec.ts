import { PrismaWorkOrderPartSupplyRepository } from '@infrastructure/repositories/prisma-work-order-part-supply.repository';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/client';

describe('PrismaWorkOrderPartSupplyRepository', () => {
  let repository: PrismaWorkOrderPartSupplyRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaWorkOrderPartSupplyRepository(prisma as any);
  });

  describe('create', () => {
    it('should create a work order part supply', async () => {
      const wops = WorkOrderPartSupply.create({
        workOrderId: randomUUID(),
        partSupplyId: randomUUID(),
        quantity: 3,
        unitPrice: 10.0,
      });

      prisma.workOrderPartSupply.create.mockResolvedValue({
        workOrderId: wops.workOrderId,
        partSupplyId: wops.partSupplyId,
        quantity: wops.quantity,
        unitPrice: new Prisma.Decimal(wops.unitPrice),
        totalPrice: new Prisma.Decimal(wops.totalPrice),
        createdAt: wops.createdAt,
        updatedAt: wops.updatedAt,
      });

      const result = await repository.create(wops);

      expect(result.workOrderId).toBe(wops.workOrderId);
      expect(prisma.workOrderPartSupply.create).toHaveBeenCalled();
    });
  });


  describe('createMany', () => {
    it('should create multiple items', async () => {
      const items = [
        WorkOrderPartSupply.create({
          workOrderId: randomUUID(),
          partSupplyId: randomUUID(),
          quantity: 1,
          unitPrice: 10,
        }),
      ];

      prisma.workOrderPartSupply.createMany.mockResolvedValue({ count: 1 });

      await repository.createMany(items);

      expect(prisma.workOrderPartSupply.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ workOrderId: items[0].workOrderId }),
        ]),
      });
    });
  });
});
