import type { Server } from 'http';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { AuthTokens, registerAndLogin } from '../helpers/auth.helper';
import { signTestCustomerToken } from '../helpers/customer-jwt.helper';

describe('Me (E2E)', () => {
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
    adminAuth = await registerAndLogin(
      httpServer,
      {
        name: 'Admin E2E',
        email: 'admin-me@e2e.test',
        role: 'ADMIN',
      },
      ctx.prisma,
    );
  });

  // ─── Helpers ────────────────────────────────────────────────────────────────

  let customerCounter = 0;
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

  async function createCustomer() {
    const id = ++customerCounter;
    const res = await request(httpServer)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        name: `Cliente Teste ${id}`,
        document: generateCPF(id),
        type: 'INDIVIDUAL',
        email: `cliente-me-${Date.now()}${id}@test.com`,
        phone: '11999999999',
        address: {
          street: 'Rua Teste, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        },
      })
      .expect(201);
    return res.body.data as { id: string };
  }

  async function createVehicle(customerId: string) {
    const res = await request(httpServer)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        customerId,
        plate: `ABC-${Date.now().toString().slice(-4)}`,
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
      })
      .expect(201);
    return res.body.data as { id: string };
  }

  async function createWorkOrder(customerId: string, vehicleId: string) {
    const res = await request(httpServer)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ customerId, vehicleId, problemDescription: 'Barulho no motor' })
      .expect(201);
    return res.body.data as { id: string; number: string; status: string };
  }

  /**
   * Cria diretamente via Prisma um usuário puramente externo (role null, com
   * CPF) já vinculado a um cliente ativo — equivalente ao resultado de
   * `POST /api/customers/:customerId/access-users`, mas sem depender do fluxo
   * de e-mail de senha inicial, que é irrelevante para este teste.
   */
  async function createExternalUserLinkedTo(customerId: string, cpf: string) {
    const passwordHash = await bcrypt.hash('External@123', 10);
    const user = await ctx.prisma.user.create({
      data: {
        name: `Cliente Externo ${cpf}`,
        email: `externo-${cpf}@e2e.test`,
        cpf,
        passwordHash,
        role: null,
        isActive: true,
      },
    });

    await ctx.prisma.userCustomer.create({
      data: { userId: user.id, customerId },
    });

    return user;
  }

  // ─── GET /api/me/work-orders ────────────────────────────────────────────────

  describe('GET /api/me/work-orders', () => {
    it("should not leak another customer's work orders when customerId is not authorized for the caller", async () => {
      const customerA = await createCustomer();
      const customerB = await createCustomer();
      const vehicleA = await createVehicle(customerA.id);
      const vehicleB = await createVehicle(customerB.id);

      await createWorkOrder(customerA.id, vehicleA.id);
      await createWorkOrder(customerB.id, vehicleB.id);

      const userA = await createExternalUserLinkedTo(customerA.id, generateCPF(1000));
      const tokenA = signTestCustomerToken(userA.id);

      const res = await request(httpServer)
        .get(`/api/me/work-orders?customerId=${customerB.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.totalRecords).toBe(0);
    });

    it("should return only the caller's own work orders when no customerId filter is given", async () => {
      const customerA = await createCustomer();
      const customerB = await createCustomer();
      const vehicleA = await createVehicle(customerA.id);
      const vehicleB = await createVehicle(customerB.id);

      const workOrderA = await createWorkOrder(customerA.id, vehicleA.id);
      await createWorkOrder(customerB.id, vehicleB.id);

      const userA = await createExternalUserLinkedTo(customerA.id, generateCPF(1001));
      const tokenA = signTestCustomerToken(userA.id);

      const res = await request(httpServer)
        .get('/api/me/work-orders')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(workOrderA.id);
      expect(res.body.pagination.totalRecords).toBe(1);
    });

    it('should return 401 when the token has no active linked customer', async () => {
      await request(httpServer)
        .get(`/api/me/work-orders?customerId=${randomUUID()}`)
        .set('Authorization', `Bearer ${signTestCustomerToken(randomUUID())}`)
        .expect(401);
    });
  });
});
