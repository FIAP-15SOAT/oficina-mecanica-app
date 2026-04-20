import type { Server } from 'http';
import request from 'supertest';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: string };
}

export async function registerAndLogin(
  app: Server,
  overrides: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  } = {},
): Promise<AuthTokens> {
  const uid = Date.now();
  const name = overrides.name ?? `Test User ${uid}`;
  const email = overrides.email ?? `testuser${uid}@e2e.test`;
  const password = overrides.password ?? 'Test@2026';
  const role = overrides.role ?? 'ADMIN';

  await request(app).post('/api/auth/register').send({ name, email, password, role }).expect(201);

  const loginRes = await request(app).post('/api/auth/login').send({ email, password }).expect(200);

  const { accessToken, refreshToken, user } = loginRes.body.data;

  return { accessToken, refreshToken, user };
}
