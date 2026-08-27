/* eslint-disable no-console */
import { PrismaClient, AccessRelationship } from '../generated/client';

interface AccessLinkSeed {
  userDocument: string;
  customerDocument: string;
  relationship: AccessRelationship;
}

const accessLinks: AccessLinkSeed[] = [
  {
    userDocument: '12345678909',
    customerDocument: '12345678909',
    relationship: AccessRelationship.SELF,
  },
  {
    userDocument: '39174062840',
    customerDocument: '12345678000195',
    relationship: AccessRelationship.REPRESENTATIVE,
  },
];

export async function seedUserCustomerAccess(
  prisma: PrismaClient,
  userIds: Record<string, string>,
  customerIds: Record<string, string>,
): Promise<void> {
  console.log('🌱 Seeding user-customer access links...');

  let seeded = 0;

  for (const link of accessLinks) {
    const userId = userIds[link.userDocument];
    const customerId = customerIds[link.customerDocument];

    if (!userId || !customerId) {
      console.warn(
        `  ⚠ Pulando vínculo ${link.userDocument} -> ${link.customerDocument}: usuário ou cliente não encontrado`,
      );
      continue;
    }

    await prisma.userCustomerAccess.upsert({
      where: { userId_customerId: { userId, customerId } },
      update: { relationship: link.relationship },
      create: { userId, customerId, relationship: link.relationship },
    });

    seeded += 1;
    console.log(`  ✓ Access: ${link.userDocument} -> ${link.customerDocument} (${link.relationship})`);
  }

  console.log(`✅ ${seeded} access links seeded`);
}
