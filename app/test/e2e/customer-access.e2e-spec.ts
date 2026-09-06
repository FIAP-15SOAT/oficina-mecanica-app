// test/e2e/customer-access.e2e-spec.ts
import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { AuthTokens, registerAndLogin } from '../helpers/auth.helper';

describe('Customer Access (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;
  let adminAuth: AuthTokens;
  let attendantAuth: AuthTokens;
  let mechanicAuth: AuthTokens;

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
      { name: 'Admin E2E', email: 'admin-access@e2e.test', role: 'ADMIN' },
      ctx.prisma,
    );
    attendantAuth = await registerAndLogin(
      httpServer,
      { name: 'Atendente E2E', email: 'attendant-access@e2e.test', role: 'ATTENDANT' },
      ctx.prisma,
    );
    mechanicAuth = await registerAndLogin(
      httpServer,
      { name: 'Mecânico E2E', email: 'mechanic-access@e2e.test', role: 'MECHANIC' },
      ctx.prisma,
    );
  });

  // ─── Helpers ────────────────────────────────────────────────────────────────

  let counter = 0;

  function generateCPF(index: number) {
    const base = index.toString().padStart(9, '0');
    const n = base.split('').map(Number);
    let d1 = n.reduce((acc, v, i) => acc + v * (10 - i), 0);
    d1 = 11 - (d1 % 11);
    if (d1 >= 10) d1 = 0;
    n.push(d1);
    let d2 = n.reduce((acc, v, i) => acc + v * (11 - i), 0);
    d2 = 11 - (d2 % 11);
    if (d2 >= 10) d2 = 0;
    n.push(d2);
    return n.join('');
  }

  function generateCNPJ(index: number) {
    const base = `${index.toString().padStart(8, '0')}0001`.split('').map(Number);
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let d1 = base.reduce((acc, v, i) => acc + v * w1[i], 0) % 11;
    d1 = d1 < 2 ? 0 : 11 - d1;
    const withD1 = [...base, d1];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let d2 = withD1.reduce((acc, v, i) => acc + v * w2[i], 0) % 11;
    d2 = d2 < 2 ? 0 : 11 - d2;
    return [...withD1, d2].join('');
  }

  async function createCustomer(overrides: Record<string, unknown> = {}) {
    const id = ++counter;
    const res = await request(httpServer)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        name: `Cliente Acesso ${id}`,
        document: generateCPF(id),
        type: 'INDIVIDUAL',
        email: `cliente-acesso-${Date.now()}${id}@test.com`,
        phone: '11999999999',
        address: {
          street: 'Rua Teste, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        },
        createAccess: false,
        ...overrides,
      })
      .expect(201);
    return res.body.data as { id: string; document: string };
  }

  function generatePlate(index: number) {
    return `ABC-${index.toString().padStart(4, '0')}`;
  }

  async function createCompanyCustomer(overrides: Record<string, unknown> = {}) {
    const id = ++counter;
    const res = await request(httpServer)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        name: `Empresa Acesso ${id} LTDA`,
        document: generateCNPJ(id),
        type: 'COMPANY',
        email: `empresa-acesso-${Date.now()}${id}@test.com`,
        phone: '11999999999',
        address: {
          street: 'Av. Teste, 456',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        },
        createAccess: false,
        ...overrides,
      })
      .expect(201);
    return res.body.data as { id: string; document: string };
  }

  // ─── POST /api/customers/:customerId/users ──────────────────────────

  describe('POST /api/customers/:customerId/users', () => {
    it('should create a new user by CPF and grant access for an INDIVIDUAL customer', async () => {
      const customer = await createCustomer();

      const res = await request(httpServer)
        .post(`/api/customers/${customer.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(201);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({ id: expect.any(String), email: expect.any(String) }),
          customer: expect.objectContaining({ id: customer.id }),
          initialPasswordSent: true,
        }),
      );

      const accessUsers = await request(httpServer)
        .get(`/api/customers/${customer.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(accessUsers.body.data).toHaveLength(1);
      expect(accessUsers.body.data[0].id).toBe(res.body.data.user.id);
    });

    it('should allow ATTENDANT to grant access', async () => {
      const customer = await createCustomer();

      await request(httpServer)
        .post(`/api/customers/${customer.id}/users`)
        .set('Authorization', `Bearer ${attendantAuth.accessToken}`)
        .send({})
        .expect(201);
    });

    it('should return 403 for MECHANIC role', async () => {
      const customer = await createCustomer();

      await request(httpServer)
        .post(`/api/customers/${customer.id}/users`)
        .set('Authorization', `Bearer ${mechanicAuth.accessToken}`)
        .send({})
        .expect(403);
    });

    it('should return 401 without a token', async () => {
      const customer = await createCustomer();

      await request(httpServer).post(`/api/customers/${customer.id}/users`).send({}).expect(401);
    });

    it('should return 404 when the customer does not exist', async () => {
      await request(httpServer)
        .post('/api/customers/00000000-0000-0000-0000-000000000000/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(404);
    });

    it('should grant access to a COMPANY customer when name/email/cpf are provided', async () => {
      const company = await createCompanyCustomer();

      const res = await request(httpServer)
        .post(`/api/customers/${company.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Operador da Empresa',
          email: `operador-${Date.now()}@test.com`,
          cpf: generateCPF(9001),
        })
        .expect(201);

      expect(res.body.data.initialPasswordSent).toBe(true);
    });

    it('should refuse (business rule) granting access to a COMPANY customer without name/email/cpf', async () => {
      const company = await createCompanyCustomer();

      await request(httpServer)
        .post(`/api/customers/${company.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(409);
    });

    it('should reuse the same user (not conflict) when granting access to two COMPANY customers with the same CPF', async () => {
      const companyX = await createCompanyCustomer();
      const companyY = await createCompanyCustomer();
      const sharedCpf = generateCPF(9002);

      const first = await request(httpServer)
        .post(`/api/customers/${companyX.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Sócio Compartilhado',
          email: `socio-x-${Date.now()}@test.com`,
          cpf: sharedCpf,
        })
        .expect(201);

      const second = await request(httpServer)
        .post(`/api/customers/${companyY.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Sócio Compartilhado',
          email: `socio-y-${Date.now()}@test.com`,
          cpf: sharedCpf,
        })
        .expect(201);

      expect(second.body.data.user.id).toBe(first.body.data.user.id);
      expect(second.body.data.initialPasswordSent).toBe(false);

      const totalUsersWithCpf = await ctx.prisma.user.count({
        where: { cpf: sharedCpf.replace(/\D/g, '') },
      });
      expect(totalUsersWithCpf).toBe(1);

      const linkedCustomers = await request(httpServer)
        .get(`/api/users/${first.body.data.user.id}/customers`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(linkedCustomers.body.data).toHaveLength(2);
      expect(linkedCustomers.body.data.map((c: { id: string }) => c.id).sort()).toEqual(
        [companyX.id, companyY.id].sort(),
      );
    });

    it('should conflict when the email already belongs to a different person than the one identified by cpf', async () => {
      const companyX = await createCompanyCustomer();
      const companyY = await createCompanyCustomer();
      const sharedEmail = `pessoa-original-${Date.now()}@test.com`;

      await request(httpServer)
        .post(`/api/customers/${companyX.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Pessoa Original', email: sharedEmail, cpf: generateCPF(9003) })
        .expect(201);

      await request(httpServer)
        .post(`/api/customers/${companyY.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Outra Pessoa', email: sharedEmail, cpf: generateCPF(9004) })
        .expect(409);

      const totalUsersWithEmail = await ctx.prisma.user.count({ where: { email: sharedEmail } });
      expect(totalUsersWithEmail).toBe(1);
    });

    it('should return 409 when granting access twice to the same user/customer pair', async () => {
      const customer = await createCustomer();

      await request(httpServer)
        .post(`/api/customers/${customer.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(201);

      await request(httpServer)
        .post(`/api/customers/${customer.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(409);
    });

    it('should return 409 (business rule) when the customer is inactive', async () => {
      const customer = await createCustomer();

      await request(httpServer)
        .patch(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ isActive: false })
        .expect(204);

      await request(httpServer)
        .post(`/api/customers/${customer.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(409);
    });
  });

  // ─── DELETE /api/customers/:customerId/users/:userId ────────────────

  describe('DELETE /api/customers/:customerId/users/:userId', () => {
    it('should revoke access and return 204', async () => {
      const customer = await createCustomer();

      const grant = await request(httpServer)
        .post(`/api/customers/${customer.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(201);

      await request(httpServer)
        .delete(`/api/customers/${customer.id}/users/${grant.body.data.user.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      const accessUsers = await request(httpServer)
        .get(`/api/customers/${customer.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(accessUsers.body.data).toHaveLength(0);
    });

    it('should return 404 when the link does not exist', async () => {
      const customer = await createCustomer();

      await request(httpServer)
        .delete(`/api/customers/${customer.id}/users/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 403 for MECHANIC role', async () => {
      const customer = await createCustomer();

      const grant = await request(httpServer)
        .post(`/api/customers/${customer.id}/users`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(201);

      await request(httpServer)
        .delete(`/api/customers/${customer.id}/users/${grant.body.data.user.id}`)
        .set('Authorization', `Bearer ${mechanicAuth.accessToken}`)
        .expect(403);
    });
  });

  // ─── PATCH /api/customers/:customerId ────────────────────────────────

  describe('PATCH /api/customers/:customerId', () => {
    it('should deactivate an active customer and persist the change', async () => {
      const customer = await createCustomer();

      await request(httpServer)
        .patch(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ isActive: false })
        .expect(204);

      const found = await ctx.prisma.customer.findUnique({ where: { id: customer.id } });

      expect(found?.isActive).toBe(false);
    });

    it('should reactivate a previously deactivated customer', async () => {
      const customer = await createCustomer();

      await request(httpServer)
        .patch(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ isActive: false })
        .expect(204);

      await request(httpServer)
        .patch(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ isActive: true })
        .expect(204);

      const found = await ctx.prisma.customer.findUnique({ where: { id: customer.id } });

      expect(found?.isActive).toBe(true);
    });

    it('should return 404 for a non-existent customer', async () => {
      await request(httpServer)
        .patch('/api/customers/00000000-0000-0000-0000-000000000000/status')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ isActive: false })
        .expect(404);
    });

    it('should return 403 for MECHANIC role', async () => {
      const customer = await createCustomer();

      await request(httpServer)
        .patch(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${mechanicAuth.accessToken}`)
        .send({ isActive: false })
        .expect(403);
    });

    it('should refuse (business rule) creating a vehicle for an inactive customer', async () => {
      const customer = await createCustomer();

      await request(httpServer)
        .patch(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ isActive: false })
        .expect(204);

      await request(httpServer)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId: customer.id,
          plate: generatePlate(++counter),
          brand: 'Fiat',
          model: 'Uno',
          year: 2020,
        })
        .expect(409);
    });

    it('should refuse (business rule) opening a work order for an inactive customer', async () => {
      const customer = await createCustomer();

      const vehicle = await request(httpServer)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId: customer.id,
          plate: generatePlate(++counter),
          brand: 'Fiat',
          model: 'Uno',
          year: 2020,
        })
        .expect(201);

      await request(httpServer)
        .patch(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ isActive: false })
        .expect(204);

      await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId: customer.id,
          vehicleId: vehicle.body.data.id,
          problemDescription: 'Barulho no motor',
        })
        .expect(409);
    });
  });
});
