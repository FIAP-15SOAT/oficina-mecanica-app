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

  // ─── POST /api/auth/register ──────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(httpServer)
        .post('/api/auth/register')
        .send({
          name: 'João Silva',
          email: 'joao@e2e.test',
          password: 'Senha@123',
          role: 'ADMIN',
        })
        .expect(201);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'João Silva',
          email: 'joao@e2e.test',
          role: 'ADMIN',
          isActive: true,
        }),
      );
    });

    it('should register with default role ATTENDANT when role is omitted', async () => {
      const res = await request(httpServer)
        .post('/api/auth/register')
        .send({
          name: 'Maria Santos',
          email: 'maria@e2e.test',
          password: 'Senha@123',
        })
        .expect(201);

      expect(res.body.data.role).toBe('ATTENDANT');
    });

    it('should return 409 when registering with duplicate email', async () => {
      await request(httpServer)
        .post('/api/auth/register')
        .send({
          name: 'João Silva',
          email: 'duplicate@e2e.test',
          password: 'Senha@123',
        })
        .expect(201);

      await request(httpServer)
        .post('/api/auth/register')
        .send({
          name: 'Outro Nome',
          email: 'duplicate@e2e.test',
          password: 'Senha@123',
        })
        .expect(409);
    });

    it('should return 400 when body is invalid', async () => {
      await request(httpServer)
        .post('/api/auth/register')
        .send({ name: '', email: 'invalid', password: '12' })
        .expect(400);
    });

    it('should return 400 when extra fields are sent', async () => {
      await request(httpServer)
        .post('/api/auth/register')
        .send({
          name: 'João',
          email: 'joao@e2e.test',
          password: 'Senha@123',
          unknownField: 'value',
        })
        .expect(400);
    });
  });

  // ─── POST /api/auth/login ─────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(httpServer)
        .post('/api/auth/register')
        .send({
          name: 'Login User',
          email: 'login@e2e.test',
          password: 'Senha@123',
          role: 'ADMIN',
        })
        .expect(201);
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
  });

  // ─── POST /api/auth/refresh ───────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const auth = await registerAndLogin(httpServer);

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
  });

  // ─── GET /api/auth/me ─────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return current user data', async () => {
      const auth = await registerAndLogin(httpServer, { name: 'Me User', email: 'me@e2e.test' });

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
  });
});
