import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { registerAndLogin } from '../helpers/auth.helper';

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

  // ─── GET /api/auth/me ─────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return current user data', async () => {
      const auth = await registerAndLogin(
        httpServer,
        { name: 'Me User', email: 'me@e2e.test' },
        ctx.prisma,
      );

      const res = await request(httpServer)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: auth.user.id,
          name: 'Me User',
          email: 'me@e2e.test',
          role: 'ADMIN',
          isActive: true,
        }),
      );
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/auth/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(httpServer)
        .get('/api/auth/me')
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
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(401);
    });

    it('should return dates with Brazil timezone offset in response', async () => {
      const auth = await registerAndLogin(
        httpServer,
        {
          name: 'Date User',
          email: 'date-user@e2e.test',
        },
        ctx.prisma,
      );

      const res = await request(httpServer)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);

      expect(res.body.data.createdAt).toMatch(/-03:00$/);
      expect(res.body.data.updatedAt).toMatch(/-03:00$/);
    });
  });
});
