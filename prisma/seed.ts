/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedUsers, seedServices } from './seeds/index.js';

const prisma = new PrismaClient();

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
