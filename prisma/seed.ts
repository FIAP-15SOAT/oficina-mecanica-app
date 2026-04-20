/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { seedUsers } from './seeds/user.seed';
import { seedServices } from './seeds/service.seed';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('🚀 Starting database seed...\n');

  await seedUsers(prisma);
  await seedServices(prisma);

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
