/* eslint-disable no-console */
import { PrismaClient, UserRole } from '../generated/client';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'Tech@2026';

interface UserSeed {
  name: string;
  email: string;
  document: string;
  role: UserRole;
}

const users: UserSeed[] = [
  {
    name: 'Guilherme da Rocha Salvador',
    email: 'guilhermedarochasalvador@gmail.com',
    document: '48216539070',
    role: UserRole.ADMIN,
  },
  {
    name: 'Lucas Almeida da Silva',
    email: 'lucas.almeida-silva@hotmail.com',
    document: '60729384187',
    role: UserRole.ADMIN,
  },
  {
    name: 'Ramoon Lincoln Barros Camacho',
    email: 'ramooncamacho@hotmail.com',
    document: '73941825682',
    role: UserRole.ADMIN,
  },
  {
    name: 'Renan Santana Camacho',
    email: 'camacho.renan@gmail.com',
    document: '85402763135',
    role: UserRole.ADMIN,
  },
  {
    name: 'João da Silva',
    email: 'joao.silva.cliente@oficina.com',
    document: '12345678909',
    role: UserRole.CUSTOMER,
  },
  {
    name: 'Carlos Mendes',
    email: 'carlos.mendes@oficinarceira.com.br',
    document: '39174062840',
    role: UserRole.CUSTOMER,
  },
];

export async function seedUsers(prisma: PrismaClient): Promise<Record<string, string>> {
  console.log('🌱 Seeding users...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  const ids: Record<string, string> = {};

  for (const user of users) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        document: user.document,
        role: user.role,
      },
      create: {
        name: user.name,
        email: user.email,
        document: user.document,
        passwordHash,
        role: user.role,
        isActive: true,
      },
    });

    ids[user.document] = record.id;
    console.log(`  ✔ ${user.name} (${user.email})`);
  }

  console.log(`✅ ${users.length} users seeded (senha padrão: ${DEFAULT_PASSWORD})`);

  return ids;
}
