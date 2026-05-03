import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { AuthTokens, registerAndLogin } from '../helpers/auth.helper';

describe('WorkOrder (E2E)', () => {
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
    adminAuth = await registerAndLogin(httpServer, {
      name: 'Admin E2E',
      email: 'admin@e2e.test',
      role: 'ADMIN',
    });
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
        email: `cliente${Date.now()}${id}@test.com`,
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

  // ─── POST /api/work-orders ──────────────────────────────────────────────────

  describe('POST /api/work-orders', () => {
    it('should create a work order with RECEIVED status', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);

      const res = await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ customerId: customer.id, vehicleId: vehicle.id })
        .expect(201);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          number: expect.stringMatching(/^\d{6}$/),
          status: 'RECEIVED',
          customerId: customer.id,
          vehicleId: vehicle.id,
        }),
      );
    });

    it('should return 401 without token', async () => {
      await request(httpServer).post('/api/work-orders').send({}).expect(401);
    });

    it('should return 404 when customer not found', async () => {
      await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ customerId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', vehicleId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
        .expect(404);
    });

    it('should return 404 when vehicle not found', async () => {
      const customer = await createCustomer();
      await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ customerId: customer.id, vehicleId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
        .expect(404);
    });

    it('should create a work order with assigned user', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);

      // Get the admin user id (which is already registered)
      const usersRes = await request(httpServer)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      const adminUserId = usersRes.body.data.find((u: any) => u.email === 'admin@e2e.test').id;

      const res = await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId: customer.id,
          vehicleId: vehicle.id,
          assignedUserId: adminUserId
        })
        .expect(201);

      expect(res.body.data.assignedUserId).toBe(adminUserId);
    });

    it('should return 404 when assigned user not found', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);

      await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId: customer.id,
          vehicleId: vehicle.id,
          assignedUserId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
        })
        .expect(404);
    });

    it('should return 409 when vehicle does not belong to customer', async () => {
      const customer1 = await createCustomer();
      const customer2 = await createCustomer();
      const vehicleOfCustomer2 = await createVehicle(customer2.id);

      await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ customerId: customer1.id, vehicleId: vehicleOfCustomer2.id })
        .expect(409);
    });
  });

  // ─── GET /api/work-orders ──────────────────────────────────────────────────

  describe('GET /api/work-orders', () => {
    it('should list work orders paginated', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      await createWorkOrder(customer.id, vehicle.id);

      const res = await request(httpServer)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should use default pagination (page=1, limit=10) when not provided', async () => {
      const res = await request(httpServer)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });
  });

  // ─── GET /api/work-orders/:id ──────────────────────────────────────────────

  describe('GET /api/work-orders/:id', () => {
    it('should return work order by ID', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      const res = await request(httpServer)
        .get(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(wo.id);
    });

    it('should return 404 for non-existent id', async () => {
      await request(httpServer)
        .get('/api/work-orders/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /api/work-orders/:id ─────────────────────────────────────

  describe('PATCH /api/work-orders/:id', () => {
    it('should transition RECEIVED -> IN_DIAGNOSIS', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      const res = await request(httpServer)
        .patch(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'IN_DIAGNOSIS' })
        .expect(200);

      expect(res.body.data.status).toBe('IN_DIAGNOSIS');
    });

    it('should cancel a work order with notes', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      const res = await request(httpServer)
        .patch(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'CANCELLED', notes: 'Cancelado pelo cliente' })
        .expect(200);

      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('should return 409 when cancelling without notes', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      await request(httpServer)
        .patch(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'CANCELLED' })
        .expect(409);
    });

    it('should return 400 when setting APPROVED via PATCH (not allowed via status endpoint)', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      await request(httpServer)
        .patch(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(400);
    });

    it('should return 404 for non-existent work order during status update', async () => {
      await request(httpServer)
        .patch('/api/work-orders/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'IN_DIAGNOSIS' })
        .expect(404);
    });
  });

  // ─── DELETE /api/work-orders/:id ───────────────────────────────────────────

  describe('DELETE /api/work-orders/:id', () => {
    it('should return 404 since delete endpoint was removed', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      await request(httpServer)
        .delete(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });
  });

  // ─── GET /api/work-orders/:id/status-history ───────────────────────────────

  describe('GET /api/work-orders/:id/status-history', () => {
    it('should return status history', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      const res = await request(httpServer)
        .get(`/api/work-orders/${wo.id}/status-history`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toEqual(
        expect.objectContaining({ newStatus: 'RECEIVED' }),
      );
    });
  });

  // ─── PUT /api/work-orders/:id ──────────────────────────────────────────────

  describe('PUT /api/work-orders/:id', () => {
    it('should update work order details', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      const res = await request(httpServer)
        .put(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          problemDescription: 'Problema atualizado',
          internalNotes: 'Notas internas',
          mileageAtService: 50000,
        })
        .expect(200);

      expect(res.body.data.problemDescription).toBe('Problema atualizado');
      expect(res.body.data.internalNotes).toBe('Notas internas');
      expect(res.body.data.mileageAtService).toBe(50000);
    });

    it('should return 404 when work order does not exist during update', async () => {
      await request(httpServer)
        .put('/api/work-orders/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ problemDescription: 'Test' })
        .expect(404);
    });

    it('should return 404 when assigned user does not exist during update', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      await request(httpServer)
        .put(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ assignedUserId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
        .expect(404);
    });
  });

  describe('GET /api/work-orders/:id/status-history', () => {
    it('should return 404 when work order does not exist', async () => {
      await request(httpServer)
        .get('/api/work-orders/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/status-history')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /api/work-orders/:id/services/:serviceId ────────────────

  describe('PATCH /api/work-orders/:id/services/:serviceId', () => {
    it('should update service status within a work order', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      // We need to have a service linked to the work order.
      // Usually services are linked via approved quotes.
      // For this test, we'll manually link it in DB or use a quote flow.
      // Using quote flow is more "E2E".

      await request(httpServer)
        .patch(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'IN_DIAGNOSIS' })
        .expect(200);

      const serviceRes = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Troca de Óleo', basePrice: 100, estimatedTimeMin: 30 })
        .expect(201);
      const serviceId = serviceRes.body.data.id;

      const quoteRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId: wo.id })
        .expect(201);
      const quoteId = quoteRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(200);

      // Now the service is in the work order with status PENDING
      // Move to IN_PROGRESS first (to move WO to IN_PROGRESS)
      await request(httpServer)
        .patch(`/api/work-orders/${wo.id}/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      const res = await request(httpServer)
        .patch(`/api/work-orders/${wo.id}/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('should return 404 for status update of non-existent work order', async () => {
      await request(httpServer)
        .patch('/api/work-orders/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/services/b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(404);
    });

    it('should return 404 for status update of service not in work order', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      await request(httpServer)
        .patch(`/api/work-orders/${wo.id}/services/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'COMPLETED' })
        .expect(404);
    });

    it('should transition service to IN_PROGRESS and trigger stock movements', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      await request(httpServer)
        .patch(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'IN_DIAGNOSIS' })
        .expect(200);

      const serviceRes = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Troca de Óleo Full', basePrice: 100, estimatedTimeMin: 30 })
        .expect(201);
      const serviceId = serviceRes.body.data.id;

      const partRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Filtro',
          sku: `FLT-${Date.now()}`,
          category: 'PART',
          unit: 'UN',
          costPrice: 20,
          salePrice: 40,
          stock: 10,
          minStock: 2,
        })
        .expect(201);
      const partId = partRes.body.data.id;

      const quoteRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId: wo.id })
        .expect(201);
      const quoteId = quoteRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(200);

      // Transition to IN_PROGRESS
      const res = await request(httpServer)
        .patch(`/api/work-orders/${wo.id}/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.data.status).toBe('IN_PROGRESS');

      // Check OS status also changed to IN_PROGRESS
      const woRes = await request(httpServer)
        .get(`/api/work-orders/${wo.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(woRes.body.data.status).toBe('IN_PROGRESS');

      // Check stock movement (Wait, stock movement check is optional but good)
      const stockRes = await request(httpServer)
        .get(`/api/stock-movements?partSupplyId=${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(stockRes.body.data.length).toBeGreaterThan(0);
    });
  });

  // ─── GET /api/work-orders (Filters) ────────────────────────────────────────

  describe('GET /api/work-orders (Advanced Filters)', () => {
    it('should filter by various parameters', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const wo = await createWorkOrder(customer.id, vehicle.id);

      // Filter by number
      let res = await request(httpServer)
        .get(`/api/work-orders?number=${wo.number}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(res.body.data.length).toBe(1);

      // Filter by status
      res = await request(httpServer)
        .get('/api/work-orders?status=RECEIVED')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Filter by customerId
      res = await request(httpServer)
        .get(`/api/work-orders?customerId=${customer.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(res.body.data.length).toBe(1);

      // Filter by vehicleId
      res = await request(httpServer)
        .get(`/api/work-orders?vehicleId=${vehicle.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(res.body.data.length).toBe(1);

      // Filter by assignedUserId
      // Create another WO with assigned user
      const usersRes = await request(httpServer)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      const adminUserId = usersRes.body.data.find((u: any) => u.email === 'admin@e2e.test').id;

      await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ customerId: customer.id, vehicleId: vehicle.id, assignedUserId: adminUserId, problemDescription: 'Assigned WO' })
        .expect(201);

      res = await request(httpServer)
        .get(`/api/work-orders?assignedUserId=${adminUserId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.every((wo: any) => wo.assignedUserId === adminUserId)).toBe(true);
    });
  });
});
