import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { registerAndLogin, AuthTokens } from '../helpers/auth.helper';
import { nextValidCpf } from '../helpers/document.helper';

describe('UserCustomerAccess (E2E)', () => {
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

  async function createCustomer(document: string, type: 'INDIVIDUAL' | 'COMPANY' = 'INDIVIDUAL') {
    const res = await request(httpServer)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        name: 'Cliente Teste',
        document,
        type,
        email: `cliente-${Date.now()}-${Math.floor(Math.random() * 10000)}@e2e.test`,
        phone: '11999999999',
        address: { street: 'Rua A', city: 'São Paulo', state: 'SP', zipCode: '01310100' },
      })
      .expect(201);

    return res.body.data.id as string;
  }

  async function createCustomerUser(document: string) {
    return registerAndLogin(httpServer, { role: 'CUSTOMER', document }, ctx.prisma);
  }

  describe('POST /api/customers/:id/access', () => {
    it('should create a SELF link when documents match', async () => {
      const document = nextValidCpf();
      const customerId = await createCustomer(document);
      const customerUser = await createCustomerUser(document);

      const res = await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(201);

      expect(res.body.data.relationship).toBe('SELF');
      expect(res.body.data.userId).toBe(customerUser.user.id);
      expect(res.body.data.customerId).toBe(customerId);
    });

    it('should reject a SELF link when documents differ (422)', async () => {
      const customerId = await createCustomer(nextValidCpf());
      const customerUser = await createCustomerUser(nextValidCpf());

      await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(422);
    });

    it('should create a REPRESENTATIVE link even when documents differ', async () => {
      const customerId = await createCustomer('12345678000195', 'COMPANY');
      const customerUser = await createCustomerUser(nextValidCpf());

      const res = await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'REPRESENTATIVE' })
        .expect(201);

      expect(res.body.data.relationship).toBe('REPRESENTATIVE');
    });

    it('should reject linking a user whose role is not CUSTOMER (422)', async () => {
      const customerId = await createCustomer(nextValidCpf());
      const staffUser = await registerAndLogin(httpServer, { role: 'ATTENDANT' }, ctx.prisma);

      await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: staffUser.user.id, relationship: 'SELF' })
        .expect(422);
    });

    it('should return 409 when the same user/customer pair is linked twice', async () => {
      const document = nextValidCpf();
      const customerId = await createCustomer(document);
      const customerUser = await createCustomerUser(document);

      await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(201);

      await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(409);
    });

    it('should return 404 for a non-existent customer', async () => {
      const customerUser = await createCustomerUser(nextValidCpf());

      await request(httpServer)
        .post('/api/customers/00000000-0000-0000-0000-000000000000/access')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(404);
    });
  });

  describe('GET /api/work-orders with role CUSTOMER', () => {
    async function createWorkOrderForCustomer(customerId: string): Promise<string> {
      const vehicleRes = await request(httpServer)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId,
          plate: `SLF${Math.floor(1000 + Math.random() * 9000)}`,
          brand: 'Fiat',
          model: 'Uno',
          year: 2020,
        })
        .expect(201);

      const workOrderRes = await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId,
          vehicleId: vehicleRes.body.data.id,
          problemDescription: 'Barulho no motor',
        })
        .expect(201);

      return workOrderRes.body.data.id as string;
    }

    it('should list only work orders of customers linked to the authenticated user', async () => {
      const document = nextValidCpf();
      const myCustomerId = await createCustomer(document);
      const otherCustomerId = await createCustomer(nextValidCpf());

      const customerUser = await createCustomerUser(document);
      await request(httpServer)
        .post(`/api/customers/${myCustomerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(201);

      const myWorkOrderId = await createWorkOrderForCustomer(myCustomerId);
      await createWorkOrderForCustomer(otherCustomerId);

      const res = await request(httpServer)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${customerUser.accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(myWorkOrderId);
    });

    it('should ignore a ?customerId= query param for a CUSTOMER caller (IDOR protection)', async () => {
      const document = nextValidCpf();
      const myCustomerId = await createCustomer(document);
      const otherCustomerId = await createCustomer(nextValidCpf());

      const customerUser = await createCustomerUser(document);
      await request(httpServer)
        .post(`/api/customers/${myCustomerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(201);

      const myWorkOrderId = await createWorkOrderForCustomer(myCustomerId);
      await createWorkOrderForCustomer(otherCustomerId);

      const res = await request(httpServer)
        .get(`/api/work-orders?customerId=${otherCustomerId}`)
        .set('Authorization', `Bearer ${customerUser.accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(myWorkOrderId);
    });

    it('should list work orders of a REPRESENTATIVE across multiple customers', async () => {
      const companyId = await createCustomer('12345678000195', 'COMPANY');
      const representative = await createCustomerUser(nextValidCpf());

      await request(httpServer)
        .post(`/api/customers/${companyId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: representative.user.id, relationship: 'REPRESENTATIVE' })
        .expect(201);

      const companyWorkOrderId = await createWorkOrderForCustomer(companyId);

      const res = await request(httpServer)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${representative.accessToken}`)
        .expect(200);

      expect(res.body.data.map((wo: { id: string }) => wo.id)).toContain(companyWorkOrderId);
    });

    it('should return 401 without a token', async () => {
      await request(httpServer).get('/api/work-orders').expect(401);
    });
  });

  describe('GET /api/work-orders/:id with role CUSTOMER', () => {
    it('should return 404 for a work order outside the caller scope', async () => {
      const otherCustomerId = await createCustomer(nextValidCpf());

      const vehicleRes = await request(httpServer)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId: otherCustomerId,
          plate: `OUT${Math.floor(1000 + Math.random() * 9000)}`,
          brand: 'Fiat',
          model: 'Uno',
          year: 2020,
        })
        .expect(201);

      const workOrderRes = await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId: otherCustomerId,
          vehicleId: vehicleRes.body.data.id,
          problemDescription: 'Problema qualquer',
        })
        .expect(201);

      const document = nextValidCpf();
      const myCustomerId = await createCustomer(document);
      const customerUser = await createCustomerUser(document);
      await request(httpServer)
        .post(`/api/customers/${myCustomerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(201);

      await request(httpServer)
        .get(`/api/work-orders/${workOrderRes.body.data.id}`)
        .set('Authorization', `Bearer ${customerUser.accessToken}`)
        .expect(404);
    });
  });

  describe('login as a CUSTOMER-role user', () => {
    it('should authenticate by document (CPF) and access GET /api/work-orders', async () => {
      const document = nextValidCpf();
      await createCustomerUser(document);

      const loginRes = await request(httpServer)
        .post('/api/auth/login')
        .send({ identifier: document, password: 'Test@2026' })
        .expect(200);

      await request(httpServer)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
        .expect(200);
    });
  });
});
