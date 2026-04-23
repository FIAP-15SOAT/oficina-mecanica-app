import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.stockMovement.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.workOrderPart.deleteMany();
  await prisma.workOrderService.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.address.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.partSupply.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
}
