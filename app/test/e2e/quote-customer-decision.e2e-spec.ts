import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { registerAndLogin, AuthTokens } from '../helpers/auth.helper';
import { registerAndLoginCustomer, CustomerAuthTokens } from '../helpers/customer-auth.helper';

describe('Customer Quote Decision (E2E)', () => {
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

  // ─── setup local a este arquivo — mesma sequência usada em quote.e2e-spec.ts ──

  async function createVehicleForCustomer(customerId: string): Promise<string> {
    const res = await request(httpServer)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        customerId,
        plate: `ABC${Math.floor(1000 + Math.random() * 9000)}`,
        brand: 'Fiat',
        model: 'Uno',
        year: 2020,
      })
      .expect(201);

    return res.body.data.id;
  }

  async function createWorkOrderInDiagnosis(
    customerId: string,
    vehicleId: string,
  ): Promise<string> {
    const createRes = await request(httpServer)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ customerId, vehicleId, problemDescription: 'Barulho no motor' })
      .expect(201);

    const workOrderId = createRes.body.data.id;

    await request(httpServer)
      .patch(`/api/work-orders/${workOrderId}`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ status: 'IN_DIAGNOSIS' })
      .expect(200);

    return workOrderId;
  }

  async function createService(): Promise<string> {
    const res = await request(httpServer)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        name: `Troca de óleo ${Date.now()}`,
        basePrice: 150,
        estimatedTimeMin: 60,
      })
      .expect(201);

    return res.body.data.id;
  }

  async function createSentQuoteForCustomer(customer: CustomerAuthTokens): Promise<string> {
    const vehicleId = await createVehicleForCustomer(customer.customer.id);
    const workOrderId = await createWorkOrderInDiagnosis(customer.customer.id, vehicleId);
    const serviceId = await createService();

    const quoteRes = await request(httpServer)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ workOrderId })
      .expect(201);

    const quoteId = quoteRes.body.data.id;

    await request(httpServer)
      .post(`/api/quotes/${quoteId}/services`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ serviceId, quantity: 1 })
      .expect(200);

    await request(httpServer)
      .post(`/api/quotes/${quoteId}/submissions`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .expect(200);

    return quoteId;
  }

  describe('GET /api/quotes/me', () => {
    it('should list only my own SENT quotes', async () => {
      const customer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-quotes@e2e.test',
      });
      const otherCustomer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'outro-cliente@e2e.test',
      });

      const myQuoteId = await createSentQuoteForCustomer(customer);
      await createSentQuoteForCustomer(otherCustomer);

      const res = await request(httpServer)
        .get('/api/quotes/me')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(myQuoteId);
    });

    it('should return 401 without a customer token', async () => {
      await request(httpServer).get('/api/quotes/me').expect(401);
    });

    it('should return 401 when using a staff token', async () => {
      await request(httpServer)
        .get('/api/quotes/me')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(401);
    });
  });

  describe('PATCH /api/quotes/:id/decisions', () => {
    it('should let the owning customer approve their own quote', async () => {
      const customer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-aprova@e2e.test',
      });
      const quoteId = await createSentQuoteForCustomer(customer);

      const res = await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({ action: 'approve' })
        .expect(200);

      expect(res.body.data.status).toBe('APPROVED');
    });

    it('should let the owning customer reject their own quote with a reason', async () => {
      const customer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-rejeita@e2e.test',
      });
      const quoteId = await createSentQuoteForCustomer(customer);

      const res = await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({ action: 'reject', reason: 'Muito caro' })
        .expect(200);

      expect(res.body.data.status).toBe('REJECTED');
    });

    it('should return 401 when a different customer tries to decide', async () => {
      const owner = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'dono-orcamento@e2e.test',
      });
      const intruder = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'nao-dono@e2e.test',
      });
      const quoteId = await createSentQuoteForCustomer(owner);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .set('Authorization', `Bearer ${intruder.accessToken}`)
        .send({ action: 'approve' })
        .expect(401);
    });

    it('should return 404 for a non-existent quote', async () => {
      const customer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-404@e2e.test',
      });

      await request(httpServer)
        .patch('/api/quotes/00000000-0000-0000-0000-000000000000/decisions')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({ action: 'approve' })
        .expect(404);
    });

    it('should not disturb the existing e-mail-link decision flow', async () => {
      // regressão explícita: o fluxo antigo (GET .../decisions?token=) continua
      // funcionando exatamente como antes, sem nenhuma dependência do novo endpoint autenticado.
      const customer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-link-antigo@e2e.test',
      });
      const quoteId = await createSentQuoteForCustomer(customer);

      // o e-mail já foi disparado por createSentQuoteForCustomer (via submissions);
      // aqui só confirmamos que a rota pública antiga continua registrada e exigindo token,
      // sem quebrar por causa dos novos endpoints/controllers adicionados nesta feature.
      await request(httpServer).get(`/api/quotes/${quoteId}/decisions`).expect(400); // token ausente na query
    });
  });
});
