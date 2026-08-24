/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { seedUsers } from './seeds/user.seed';
import { seedServices } from './seeds/service.seed';
import { seedCustomers } from './seeds/customer.seed';
import { seedVehicles } from './seeds/vehicle.seed';
import { seedPartSupplies } from './seeds/part-supply.seed';
import { seedWorkOrders } from './seeds/work-order.seed';
import { seedWorkOrderStatusInfos } from './seeds/work-order-status-info.seed';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('🚀 Starting database seed...\n');

  await seedWorkOrderStatusInfos(prisma);
  await seedUsers(prisma);
  await seedPartSupplies(prisma);
  const serviceIds = await seedServices(prisma);
  const customerIds = await seedCustomers(prisma);
  const vehicleIds = await seedVehicles(prisma, customerIds);
  await seedWorkOrders(prisma, customerIds, vehicleIds, serviceIds);

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e: Error) => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
