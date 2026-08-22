import type { Server } from 'http';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';
import { nextValidCpf } from './document.helper';

export interface CustomerAuthTokens {
  accessToken: string;
  refreshToken: string;
  customer: { id: string; name: string; email: string; document: string; type: string };
}

export async function registerAndLoginCustomer(
  app: Server,
  prisma: PrismaService,
  overrides: {
    name?: string;
    email?: string;
    document?: string;
    password?: string;
    type?: 'INDIVIDUAL' | 'COMPANY';
  } = {},
): Promise<CustomerAuthTokens> {
  const uid = Date.now();

  const name = overrides.name ?? `Test Customer ${uid}`;
  const email = overrides.email ?? `testcustomer${uid}@e2e.test`;
  const document = overrides.document ?? nextValidCpf();
  const password = overrides.password ?? 'Test@2026';
  const type = overrides.type ?? 'INDIVIDUAL';

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.customer.create({
    data: {
      name,
      email,
      document,
      type,
      phone: '11999999999',
      passwordHash: hashedPassword,
    },
  });

  const loginRes = await request(app)
    .post('/api/auth/customer/login')
    .send({ identifier: email, password })
    .expect(200);

  const { accessToken, refreshToken, customer } = loginRes.body.data;

  return { accessToken, refreshToken, customer };
}
