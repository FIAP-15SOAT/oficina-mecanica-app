/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seeds/index.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🚀 Starting database seed...\n');

  await seedUsers(prisma);

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
