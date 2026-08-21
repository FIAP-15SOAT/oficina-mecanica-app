/* eslint-disable no-console */
import { PrismaClient, CustomerType } from '../generated/client';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'Tech@2026';

interface CustomerSeed {
  name: string;
  document: string;
  type: CustomerType;
  email: string;
  phone: string;
}

const customers: CustomerSeed[] = [
  {
    name: 'João da Silva',
    document: '12345678909',
    type: CustomerType.INDIVIDUAL,
    email: 'joao.silva@email.com',
    phone: '11999990001',
  },
  {
    name: 'Maria Souza',
    document: '98765432100',
    type: CustomerType.INDIVIDUAL,
    email: 'maria.souza@email.com',
    phone: '11999990002',
  },
  {
    name: 'Oficina Parceira LTDA',
    document: '12345678000195',
    type: CustomerType.COMPANY,
    email: 'contato@oficinarceira.com.br',
    phone: '1133330001',
  },
];

export async function seedCustomers(prisma: PrismaClient): Promise<Record<string, string>> {
  console.log('🌱 Seeding customers...');

  const ids: Record<string, string> = {};
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  for (const customer of customers) {
    const record = await prisma.customer.upsert({
      where: { document: customer.document },
      update: {
        name: customer.name,
        type: customer.type,
        email: customer.email,
        phone: customer.phone,
      },
      create: {
        name: customer.name,
        document: customer.document,
        type: customer.type,
        email: customer.email,
        phone: customer.phone,
        passwordHash,
      },
    });

    ids[customer.document] = record.id;
    console.log(`  ✓ Customer: ${customer.name}`);
  }

  console.log(`✅ ${customers.length} customers seeded (senha padrão: ${DEFAULT_PASSWORD})`);

  return ids;
}
