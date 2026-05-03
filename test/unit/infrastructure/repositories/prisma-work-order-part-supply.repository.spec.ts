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
