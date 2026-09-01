import type { Server } from 'http';
import type { StartedTestContainer } from 'testcontainers';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { registerAndLogin } from '../helpers/auth.helper';

interface MailhogMessage {
  Created: string;
  To: Array<{ Mailbox: string; Domain: string }>;
  Content: { Body: string };
}

interface MailhogResponse {
  items: MailhogMessage[];
}

async function fetchLatestResetCode(
  mailhogContainer: StartedTestContainer,
  toEmail: string,
): Promise<string> {
  const base = `http://${mailhogContainer.getHost()}:${mailhogContainer.getMappedPort(8025)}`;
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const res = await fetch(`${base}/api/v2/messages?limit=50`);
    const body = (await res.json()) as MailhogResponse;

    const matches = body.items.filter((item) =>
      item.To.some((to) => `${to.Mailbox}@${to.Domain}`.toLowerCase() === toEmail.toLowerCase()),
    );

    if (matches.length > 0) {
      matches.sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime());
      const codeMatch = matches[0].Content.Body.match(/\b(\d{6})\b/);

      if (codeMatch) {
        return codeMatch[1];
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`No password reset email found for ${toEmail}`);
}

describe('Auth (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;

  beforeAll(async () => {
    ctx = await setupTestApp();
    httpServer = ctx.httpServer;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  // ─── POST /api/auth/login ─────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await registerAndLogin(
        httpServer,
        {
          name: 'Login User',
          email: 'login@e2e.test',
          password: 'Senha@123',
          role: 'ADMIN',
        },
        ctx.prisma,
      );
    });

    it('should login successfully and return tokens', async () => {
      const res = await request(httpServer)
        .post('/api/auth/login')
        .send({ email: 'login@e2e.test', password: 'Senha@123' })
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: expect.objectContaining({
            id: expect.any(String),
            name: 'Login User',
            email: 'login@e2e.test',
            role: 'ADMIN',
          }),
        }),
      );
    });

    it('should return 401 with wrong password', async () => {
      await request(httpServer)
        .post('/api/auth/login')
        .send({ email: 'login@e2e.test', password: 'WrongPassword' })
        .expect(401);
    });

    it('should return 401 with non-existent email', async () => {
      await request(httpServer)
        .post('/api/auth/login')
        .send({ email: 'nope@e2e.test', password: 'Senha@123' })
        .expect(401);
    });

    it('should return 400 with missing fields', async () => {
      await request(httpServer)
        .post('/api/auth/login')
        .send({ email: 'login@e2e.test' })
        .expect(400);
    });

    it('should return 401 when user is deactivated', async () => {
      await ctx.prisma.user.updateMany({
        where: { email: 'login@e2e.test' },
        data: { isActive: false },
      });

      await request(httpServer)
        .post('/api/auth/login')
        .send({ email: 'login@e2e.test', password: 'Senha@123' })
        .expect(401);
    });
  });

  // ─── POST /api/auth/refresh ───────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const auth = await registerAndLogin(httpServer, {}, ctx.prisma);

      const res = await request(httpServer)
        .post('/api/auth/refresh')
        .send({ refreshToken: auth.refreshToken })
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        }),
      );
    });

    it('should return 401 with invalid refresh token', async () => {
      await request(httpServer)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });

    it('should return 400 when refreshToken is missing', async () => {
      await request(httpServer).post('/api/auth/refresh').send({}).expect(400);
    });

    it('should return 401 when user is deactivated after token issued', async () => {
      const auth = await registerAndLogin(
        httpServer,
        {
          name: 'Refresh Inactive',
          email: 'refresh-inactive@e2e.test',
        },
        ctx.prisma,
      );

      await ctx.prisma.user.update({
        where: { id: auth.user.id },
        data: { isActive: false },
      });

      await request(httpServer)
        .post('/api/auth/refresh')
        .send({ refreshToken: auth.refreshToken })
        .expect(401);
    });
  });

  // ─── GET /api/me ──────────────────────────────────────────────────────────

  describe('GET /api/me', () => {
    it('should return current user data for an internal principal', async () => {
      const auth = await registerAndLogin(
        httpServer,
        { name: 'Me User', email: 'me@e2e.test' },
        ctx.prisma,
      );

      const res = await request(httpServer)
        .get('/api/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: auth.user.id,
          name: 'Me User',
          email: 'me@e2e.test',
          role: 'ADMIN',
          customers: [],
        }),
      );
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(httpServer)
        .get('/api/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('should return 401 when user is deactivated after token issued', async () => {
      const auth = await registerAndLogin(
        httpServer,
        {
          name: 'Me Inactive',
          email: 'me-inactive@e2e.test',
        },
        ctx.prisma,
      );

      await ctx.prisma.user.update({
        where: { id: auth.user.id },
        data: { isActive: false },
      });

      await request(httpServer)
        .get('/api/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(401);
    });
  });

  // ─── POST /api/users/:userId/password-resets + POST /api/auth/password-reset-confirmations ─

  describe('Password reset by numeric code', () => {
    it('should let an admin issue a code and the user confirm a new password with it', async () => {
      const adminAuth = await registerAndLogin(
        httpServer,
        { name: 'Admin Reset', email: `admin-reset-${Date.now()}@e2e.test`, role: 'ADMIN' },
        ctx.prisma,
      );
      const targetEmail = `target-reset-${Date.now()}@e2e.test`;

      const createRes = await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Target User', email: targetEmail, role: 'ATTENDANT' })
        .expect(201);

      const targetUserId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/users/${targetUserId}/password-resets`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      const code = await fetchLatestResetCode(ctx.mailhogContainer, targetEmail);

      await request(httpServer)
        .post('/api/auth/password-reset-confirmations')
        .send({ email: targetEmail, code, newPassword: 'NewPass@789' })
        .expect(204);

      await request(httpServer)
        .post('/api/auth/login')
        .send({ email: targetEmail, password: 'NewPass@789' })
        .expect(200);
    });

    it('should exhaust the code after 5 wrong confirmation attempts', async () => {
      const adminAuth = await registerAndLogin(
        httpServer,
        { name: 'Admin Reset 2', email: `admin-reset2-${Date.now()}@e2e.test`, role: 'ADMIN' },
        ctx.prisma,
      );
      const targetEmail = `target-exhaust-${Date.now()}@e2e.test`;

      const createRes = await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Target User 2', email: targetEmail, role: 'ATTENDANT' })
        .expect(201);

      const targetUserId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/users/${targetUserId}/password-resets`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      const code = await fetchLatestResetCode(ctx.mailhogContainer, targetEmail);

      for (let i = 0; i < 5; i++) {
        await request(httpServer)
          .post('/api/auth/password-reset-confirmations')
          .send({ email: targetEmail, code: '999999', newPassword: 'NewPass@789' })
          .expect(401);
      }

      // The code is now exhausted, even with the correct value.
      await request(httpServer)
        .post('/api/auth/password-reset-confirmations')
        .send({ email: targetEmail, code, newPassword: 'NewPass@789' })
        .expect(401);
    });

    it('should invalidate a previously issued code when a new one is issued', async () => {
      const adminAuth = await registerAndLogin(
        httpServer,
        { name: 'Admin Reset 3', email: `admin-reset3-${Date.now()}@e2e.test`, role: 'ADMIN' },
        ctx.prisma,
      );
      const targetEmail = `target-invalidate-${Date.now()}@e2e.test`;

      const createRes = await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Target User 3', email: targetEmail, role: 'ATTENDANT' })
        .expect(201);

      const targetUserId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/users/${targetUserId}/password-resets`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      const oldCode = await fetchLatestResetCode(ctx.mailhogContainer, targetEmail);

      await request(httpServer)
        .post(`/api/users/${targetUserId}/password-resets`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      const newCode = await fetchLatestResetCode(ctx.mailhogContainer, targetEmail);

      await request(httpServer)
        .post('/api/auth/password-reset-confirmations')
        .send({ email: targetEmail, code: oldCode, newPassword: 'NewPass@789' })
        .expect(401);

      await request(httpServer)
        .post('/api/auth/password-reset-confirmations')
        .send({ email: targetEmail, code: newCode, newPassword: 'NewPass@789' })
        .expect(204);
    });
  });
});
