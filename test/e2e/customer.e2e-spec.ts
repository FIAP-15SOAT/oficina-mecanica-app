// test/e2e/customer.e2e-spec.ts
import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { AuthTokens, registerAndLogin } from '../helpers/auth.helper';

describe('Customer (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;
  let adminAuth: AuthTokens;
  let attendantAuth: AuthTokens;

  beforeAll(async () => {
    ctx = await setupTestApp();
    httpServer = ctx.httpServer;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    adminAuth = await registerAndLogin(httpServer, {
      name: 'Admin E2E',
      email: 'admin@e2e.test',
      role: 'ADMIN',
    });
    attendantAuth = await registerAndLogin(httpServer, {
      name: 'Atendente E2E',
      email: 'attendant@e2e.test',
      role: 'ATTENDANT',
    });
  });

  const validCustomer = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: 'INDIVIDUAL',
    email: 'joao@email.com',
    phone: '(11) 99999-9999',
  };

  // ─── POST /api/customers ──────────────────────────────────────────────────

  describe('POST /api/customers', () => {
    it('should create a customer and return 201', async () => {
      const res = await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'João da Silva',
          document: '123.456.789-09',
          type: 'INDIVIDUAL',
          email: 'joao@email.com',
        }),
      );
    });

    it('should allow ATTENDANT to create a customer', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${attendantAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);
    });

    it('should return 403 for MECHANIC role', async () => {
      const mechanicAuth = await registerAndLogin(httpServer, {
        name: 'Mecânico E2E',
        email: 'mechanic@e2e.test',
        role: 'MECHANIC',
      });
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${mechanicAuth.accessToken}`)
        .send(validCustomer)
        .expect(403);
    });

    it('should return 409 when document already exists', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);

      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, email: 'outro@email.com' })
        .expect(409);
    });

    it('should return 409 when email already exists', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);

      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, document: '987.654.321-00' })
        .expect(409);
    });

    it('should return 422 when document format is invalid', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, document: '12345678909' })
        .expect(422);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'João' })
        .expect(400);
    });

    it('should return 401 when no token is provided', async () => {
      await request(httpServer)
        .post('/api/customers')
        .send(validCustomer)
        .expect(401);
    });
  });

  // ─── GET /api/customers ───────────────────────────────────────────────────

  describe('GET /api/customers', () => {
    beforeEach(async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer);
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Empresa ABC',
          document: '12.345.678/0001-09',
          type: 'COMPANY',
          email: 'empresa@email.com',
          phone: '(11) 88888-8888',
        });
    });

    it('should return paginated list', async () => {
      const res = await request(httpServer)
        .get('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination.totalRecords).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should filter by name (partial match)', async () => {
      const res = await request(httpServer)
        .get('/api/customers?name=João')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBe(1);
      expect(res.body.data[0].name).toContain('João');
    });

    it('should filter by type', async () => {
      const res = await request(httpServer)
        .get('/api/customers?type=INDIVIDUAL')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBe(1);
      expect(res.body.data[0].type).toBe('INDIVIDUAL');
    });

    it('should filter by exact document', async () => {
      const res = await request(httpServer)
        .get('/api/customers?document=123.456.789-09')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBe(1);
    });
  });

  // ─── GET /api/customers/:id ───────────────────────────────────────────────

  describe('GET /api/customers/:id', () => {
    it('should return customer by id', async () => {
      const created = await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);

      const res = await request(httpServer)
        .get(`/api/customers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(created.body.data.id);
    });

    it('should return 404 when customer does not exist', async () => {
      await request(httpServer)
        .get('/api/customers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(httpServer)
        .get('/api/customers/not-a-uuid')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(400);
    });
  });

  // ─── PUT /api/customers/:id ───────────────────────────────────────────────

  describe('PUT /api/customers/:id', () => {
    it('should update customer and return 200', async () => {
      const created = await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);

      const res = await request(httpServer)
        .put(`/api/customers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'João Atualizado' })
        .expect(200);

      expect(res.body.data.name).toBe('João Atualizado');
    });

    it('should return 404 when customer does not exist', async () => {
      await request(httpServer)
        .put('/api/customers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'X' })
        .expect(404);
    });

    it('should return 409 when updating to a document that belongs to another customer', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer);

      const second = await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, document: '987.654.321-00', email: 'outro@email.com' })
        .expect(201);

      await request(httpServer)
        .put(`/api/customers/${second.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ document: '123.456.789-09' })
        .expect(409);
    });
  });

  // ─── DELETE /api/customers/:id ────────────────────────────────────────────

  describe('DELETE /api/customers/:id', () => {
    it('should delete customer and return 204', async () => {
      const created = await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);

      await request(httpServer)
        .delete(`/api/customers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);
    });

    it('should return 404 when customer does not exist', async () => {
      await request(httpServer)
        .delete('/api/customers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 409 when customer has vehicles', async () => {
      const created = await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);

      await ctx.prisma.vehicle.create({
        data: {
          customerId: created.body.data.id,
          plate: 'ABC-1234',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
        },
      });

      await request(httpServer)
        .delete(`/api/customers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(409);
    });
  });
});
