import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { registerAndLogin, AuthTokens } from '../helpers/auth.helper';
import { registerAndLoginCustomer } from '../helpers/customer-auth.helper';

describe('Customer Password (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;
  let adminAuth: AuthTokens;

  beforeAll(async () => {
    ctx = await setupTestApp();
    httpServer = ctx.httpServer;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    adminAuth = await registerAndLogin(httpServer, { role: 'ADMIN' }, ctx.prisma);
  });

  describe('PATCH /api/auth/customer/password', () => {
    it('should change own password and allow login with the new password', async () => {
      const auth = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-self-password@e2e.test',
        password: 'Senha@123',
      });

      await request(httpServer)
        .patch('/api/auth/customer/password')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({ currentPassword: 'Senha@123', newPassword: 'NovaSenha@456' })
        .expect(204);

      await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: 'cliente-self-password@e2e.test', password: 'NovaSenha@456' })
        .expect(200);
    });

    it('should return 401 if current password is wrong', async () => {
      const auth = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-self-wrong@e2e.test',
        password: 'Senha@123',
      });

      await request(httpServer)
        .patch('/api/auth/customer/password')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({ currentPassword: 'ErradaMesmo', newPassword: 'NovaSenha@456' })
        .expect(401);
    });

    it('should return 401 when using a staff access token', async () => {
      await request(httpServer)
        .patch('/api/auth/customer/password')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ currentPassword: 'x', newPassword: 'NovaSenha@456' })
        .expect(401);
    });
  });

  describe('PATCH /api/customers/:id/password', () => {
    it('should let an admin reset a customer password (old password stops working)', async () => {
      const target = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-reset@e2e.test',
        password: 'Senha@123',
      });

      await request(httpServer)
        .patch(`/api/customers/${target.customer.id}/password`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: 'cliente-reset@e2e.test', password: 'Senha@123' })
        .expect(401);
    });

    it('should let an attendant reset a customer password too', async () => {
      const attendant = await registerAndLogin(httpServer, { role: 'ATTENDANT' }, ctx.prisma);
      const target = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-reset-2@e2e.test',
      });

      await request(httpServer)
        .patch(`/api/customers/${target.customer.id}/password`)
        .set('Authorization', `Bearer ${attendant.accessToken}`)
        .expect(204);
    });

    it('should return 403 for a MECHANIC', async () => {
      const mechanic = await registerAndLogin(httpServer, { role: 'MECHANIC' }, ctx.prisma);
      const target = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-reset-3@e2e.test',
      });

      await request(httpServer)
        .patch(`/api/customers/${target.customer.id}/password`)
        .set('Authorization', `Bearer ${mechanic.accessToken}`)
        .expect(403);
    });
  });
});
