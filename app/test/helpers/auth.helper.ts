import type { Server } from 'http';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';
import { nextValidCpf } from './document.helper';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; document: string; role: string };
}

export async function registerAndLogin(
  app: Server,
  overrides: {
    name?: string;
    email?: string;
    document?: string;
    password?: string;
    role?: string;
  } = {},
  prisma?: PrismaService,
): Promise<AuthTokens> {
  const uid = Date.now();

  const name = overrides.name ?? `Test User ${uid}`;
  const email = overrides.email ?? `testuser${uid}@e2e.test`;
  const document = overrides.document ?? nextValidCpf();
  const password = overrides.password ?? 'Test@2026';
  const role = overrides.role ?? 'ADMIN';

  if (prisma) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        email,
        document,
        passwordHash: hashedPassword,
        role: role as 'ADMIN' | 'MECHANIC' | 'ATTENDANT' | 'CUSTOMER',
      },
    });
  } else {
    await request(app)
      .post('/api/users')
      .send({ name, email, document, password, role })
      .expect(201);
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: email, password })
    .expect(200);
  const { accessToken, refreshToken, user } = loginRes.body.data;

  return { accessToken, refreshToken, user };
}
