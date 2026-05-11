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
    adminAuth = await registerAndLogin(
      httpServer,
      {
        name: 'Admin E2E',
        email: 'admin@e2e.test',
        role: 'ADMIN',
      },
      ctx.prisma,
    );
    attendantAuth = await registerAndLogin(
      httpServer,
      {
        name: 'Atendente E2E',
        email: 'attendant@e2e.test',
        role: 'ATTENDANT',
      },
      ctx.prisma,
    );
  });

  const validCustomer = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: 'INDIVIDUAL',
    email: 'joao@email.com',
    phone: '(11) 99999-9999',
    address: {
      street: 'Rua Teste, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
    },
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
          document: '12345678909',
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
      const mechanicAuth = await registerAndLogin(
        httpServer,
        {
          name: 'Mecânico E2E',
          email: 'mechanic@e2e.test',
          role: 'MECHANIC',
        },
        ctx.prisma,
      );
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

    it('should return 400 when document length is invalid', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, document: '123.456.789-0' }) // 10 digits
        .expect(400);
    });

    it('should return 400 when CPF checksum is invalid', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, document: '123.456.789-00' }) // Invalid checksum
        .expect(400);
    });

    it('should return 400 when CNPJ length is invalid', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, document: '12.345.678/0001-0', type: 'LEGAL_ENTITY' }) // 13 digits
        .expect(400);
    });

    it('should return 400 when CNPJ has repeated digits', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, document: '11.111.111/1111-11', type: 'LEGAL_ENTITY' })
        .expect(400);
    });

    it('should return 400 when CNPJ check digits are not numeric', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, document: '12.345.678/0001-A1', type: 'LEGAL_ENTITY' })
        .expect(400);
    });

    it('should return 400 when CNPJ checksum is invalid', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, document: '12.345.678/0001-99', type: 'LEGAL_ENTITY' })
        .expect(400);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'João' })
        .expect(400);
    });

    it('should return 400 when name is shorter than the minimum length', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, name: 'ab' })
        .expect(400);
    });

    it('should return 400 when name exceeds the maximum length', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, name: 'a'.repeat(151) })
        .expect(400);
    });

    it('should return 400 for various invalid document formats (Validator coverage)', async () => {
      const invalidDocs = [
        '123', // too short
        '111.111.111-11', // CPF all same
        '123.456.789-00', // CPF invalid check digit
        '12.345.678/0001-00', // CNPJ invalid check digit
        '11.111.111/1111-11', // CNPJ all same
        '11.222.333/0001-AA', // CNPJ non-numeric check digits
        '12.345.678/0001-951', // neither 11 nor 14 (stripped)
        '1234567890', // 10 digits
        '1234567890123', // 13 digits
        '123.456.789-0A', // Stripped length 11, but digits only length 10
        '123.456.789-10', // Invalid CPF checksum
      ];

      for (const doc of invalidDocs) {
        await request(httpServer)
          .post('/api/customers')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .send({
            ...validCustomer,
            document: doc,
            email: `test-${doc.replaceAll(/\D/g, '')}@email.com`,
          })
          .expect(400);
      }
    });

    it('should return 400 when email is invalid', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, email: 'notanemail' })
        .expect(400);
    });

    it('should return 400 when type is invalid', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, type: 'INVALID_TYPE' })
        .expect(400);
    });

    it('should return 400 when phone format is invalid', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, phone: 'abc' })
        .expect(400);
    });

    it('should return 400 when address.state is not exactly 2 characters', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, address: { ...validCustomer.address, state: 'SPA' } })
        .expect(400);
    });

    it('should return 400 when address.zipCode is invalid', async () => {
      await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, address: { ...validCustomer.address, zipCode: 'invalid' } })
        .expect(400);
    });

    it('should return 401 when no token is provided', async () => {
      await request(httpServer).post('/api/customers').send(validCustomer).expect(401);
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
          document: '11.222.333/0001-81',
          type: 'COMPANY',
          email: 'empresa@email.com',
          phone: '(11) 98888-8888',
          address: {
            street: 'Av. Paulista, 1000',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310-100',
          },
        });
    });

    it('should return paginated list', async () => {
      const res = await request(httpServer)
        .get('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.totalRecords).toBeGreaterThanOrEqual(2);
    });

    it('should use default pagination (page=1, limit=10) when not provided', async () => {
      const res = await request(httpServer)
        .get('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

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
        .get('/api/customers?document=12345678909')
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

    it('should return customer with null address when no address exists in DB', async () => {
      // Create a customer directly in the DB without an address to cover the
      // null branch in customer.presenter.ts (the HTTP API requires address).
      const customer = await ctx.prisma.customer.create({
        data: {
          name: 'Sem Endereço',
          document: '98765432100',
          type: 'INDIVIDUAL',
          email: 'semendereco@email.com',
          phone: '11987654321',
        },
      });

      const res = await request(httpServer)
        .get(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.address).toBeNull();
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
        .send({
          ...validCustomer,
          name: 'João Atualizado',
        })
        .expect(200);

      expect(res.body.data.name).toBe('João Atualizado');
    });

    it('should return 404 when customer does not exist', async () => {
      await request(httpServer)
        .put('/api/customers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(404);
    });

    it('should return 400 when updating with a name that exceeds the maximum length', async () => {
      const created = await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);

      await request(httpServer)
        .put(`/api/customers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, name: 'a'.repeat(151) })
        .expect(400);
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
        .send({
          ...validCustomer,
          document: '123.456.789-09',
          email: 'outro@email.com',
        })
        .expect(409);
    });

    it('should return 409 when updating to an email that belongs to another customer', async () => {
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
        .send({
          ...validCustomer,
          document: '987.654.321-00',
          email: 'joao@email.com',
        })
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

    it('should return 409 when customer has work orders', async () => {
      const created = await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);

      const vehicle = await ctx.prisma.vehicle.create({
        data: {
          customerId: created.body.data.id,
          plate: 'ABC-1234',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2020,
        },
      });

      await ctx.prisma.workOrder.create({
        data: {
          number: 'WO-CUST-DEL-1',
          customerId: created.body.data.id,
          vehicleId: vehicle.id,
        },
      });

      await request(httpServer)
        .delete(`/api/customers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(409);
    });
  });

  describe('GET /customers/:id/vehicles', () => {
    it('should return vehicles for a given customer', async () => {
      const created = await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validCustomer)
        .expect(201);

      const customerId = created.body.data.id;

      await request(httpServer)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId,
          plate: 'XYZ-9999',
          brand: 'Honda',
          model: 'Civic',
          year: 2022,
        })
        .expect(201);

      const res = await request(httpServer)
        .get(`/api/customers/${customerId}/vehicles`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].plate).toBe('XYZ9999');
    });

    it('should return empty list if customer has no vehicles', async () => {
      const created = await request(httpServer)
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validCustomer, document: '987.654.321-00', email: 'empty@test.com' })
        .expect(201);

      const res = await request(httpServer)
        .get(`/api/customers/${created.body.data.id}/vehicles`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
    });

    it('should return 404 for non-existent customer', async () => {
      await request(httpServer)
        .get('/api/customers/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/vehicles')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });
  });
});
