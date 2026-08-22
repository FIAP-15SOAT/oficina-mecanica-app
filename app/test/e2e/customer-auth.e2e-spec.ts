import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { registerAndLoginCustomer } from '../helpers/customer-auth.helper';
import { registerAndLogin } from '../helpers/auth.helper';

describe('Customer Auth (E2E)', () => {
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

  describe('POST /api/auth/customer/login', () => {
    it('should login successfully by e-mail and return tokens', async () => {
      const auth = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        name: 'Cliente Login',
        email: 'cliente-login@e2e.test',
        password: 'Senha@123',
      });

      expect(auth.accessToken).toBeDefined();
      expect(auth.refreshToken).toBeDefined();
      expect(auth.customer.email).toBe('cliente-login@e2e.test');
    });

    it('should login successfully by document', async () => {
      const document = '10000000108';

      await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-doc@e2e.test',
        document,
        password: 'Senha@123',
      });

      const res = await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: document, password: 'Senha@123' })
        .expect(200);

      expect(res.body.data.customer.document).toBe(document);
    });

    it('should return 401 with wrong password', async () => {
      await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-senha@e2e.test',
        password: 'Senha@123',
      });

      await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: 'cliente-senha@e2e.test', password: 'SenhaErrada' })
        .expect(401);
    });

    it('should return 401 with non-existent identifier', async () => {
      await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: 'naoexiste@e2e.test', password: 'Senha@123' })
        .expect(401);
    });

    it('should return 400 with missing fields', async () => {
      await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: 'cliente-login@e2e.test' })
        .expect(400);
    });

    it('should reject a genuine staff (User) access token on a customer-guarded route', async () => {
      const staffAuth = await registerAndLogin(httpServer, {}, ctx.prisma);

      await request(httpServer)
        .get('/api/auth/customer/me')
        .set('Authorization', `Bearer ${staffAuth.accessToken}`)
        .expect(401);
    });
  });

  describe('POST /api/auth/customer/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const auth = await registerAndLoginCustomer(httpServer, ctx.prisma);

      const res = await request(httpServer)
        .post('/api/auth/customer/refresh')
        .send({ refreshToken: auth.refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 with invalid refresh token', async () => {
      await request(httpServer)
        .post('/api/auth/customer/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });
  });

  describe('GET /api/auth/customer/me', () => {
    it('should return current customer data', async () => {
      const auth = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        name: 'Cliente Me',
        email: 'cliente-me@e2e.test',
      });

      const res = await request(httpServer)
        .get('/api/auth/customer/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: auth.customer.id,
          name: 'Cliente Me',
          email: 'cliente-me@e2e.test',
        }),
      );
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/auth/customer/me').expect(401);
    });

    it('should reject a genuine customer access token on a staff-guarded route', async () => {
      const customerAuth = await registerAndLoginCustomer(httpServer, ctx.prisma);

      await request(httpServer)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customerAuth.accessToken}`)
        .expect(401);
    });
  });
});
