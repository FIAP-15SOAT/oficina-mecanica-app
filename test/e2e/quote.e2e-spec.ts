import type { Server } from 'http';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { AuthTokens, registerAndLogin } from '../helpers/auth.helper';

describe('Quote (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;
  let adminAuth: AuthTokens;
  const secret = 'test-jwt-secret-key-for-e2e';
  let jwtService: JwtService;

  beforeAll(async () => {
    ctx = await setupTestApp();
    httpServer = ctx.httpServer;
    jwtService = new JwtService({ secret });
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

  async function createWorkOrderInDiagnosis() {
    const customer = await createCustomer();
    const vehicle = await createVehicle(customer.id);

    const woRes = await request(httpServer)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ customerId: customer.id, vehicleId: vehicle.id, problemDescription: 'Revisão geral' })
      .expect(201);

    const wo = woRes.body.data as { id: string };

    await request(httpServer)
      .patch(`/api/work-orders/${wo.id}`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ status: 'IN_DIAGNOSIS' })
      .expect(200);

    return { workOrderId: wo.id, customer, vehicle };
  }

  async function createService() {
    const res = await request(httpServer)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        name: `Troca de óleo ${Date.now()}`,
        description: 'Troca de óleo do motor',
        basePrice: 150,
        estimatedTimeMin: 30,
      })
      .expect(201);
    return res.body.data as { id: string };
  }

  async function createPartSupply() {
    const res = await request(httpServer)
      .post('/api/parts-supplies')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        name: `Filtro de Óleo ${Date.now()}`,
        sku: `FILT-OL-${Date.now()}`,
        category: 'PART',
        unit: 'UN',
        costPrice: 25,
        salePrice: 45,
        stock: 50,
        minStock: 5,
      })
      .expect(201);
    return res.body.data as { id: string };
  }

  // ─── POST /api/quotes ────────────────────────────────────────────────────────

  describe('POST /api/quotes', () => {
    it('should create a quote for an IN_DIAGNOSIS work order', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();

      const res = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          workOrder: expect.objectContaining({ id: workOrderId }),
          status: 'PENDING',
          totalAmount: 0,
        }),
      );
    });

    it('should return 422 when work order is RECEIVED', async () => {
      const customer = await createCustomer();
      const vehicle = await createVehicle(customer.id);
      const woRes = await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ customerId: customer.id, vehicleId: vehicle.id })
        .expect(201);

      await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId: woRes.body.data.id })
        .expect(409);
    });

    it('should return 404 when work order does not exist', async () => {
      await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
        .expect(404);
    });

    it('should return 400 when notes exceed the maximum length', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();

      await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId, notes: 'a'.repeat(2001) })
        .expect(400);
    });

    it('should return 400 when workOrderId is not a valid UUID', async () => {
      await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId: 'not-a-uuid' })
        .expect(400);
    });
  });

  // ─── GET /api/quotes/:id ─────────────────────────────────────────────────────

  describe('GET /api/quotes/:id', () => {
    it('should return a quote by id with workOrder object', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id as string;

      const res = await request(httpServer)
        .get(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(quoteId);
      expect(res.body.data.workOrder).toBeDefined();
      expect(res.body.data.workOrder.id).toBe(workOrderId);
      expect(res.body.data.workOrder.services).toBeUndefined();
      expect(res.body.data.workOrder.partSupplies).toBeUndefined();
      expect((res.body.data as Record<string, unknown>)['workOrderId']).toBeUndefined();
    });

    it('should return 422 for non-existent quote', async () => {
      await request(httpServer)
        .get('/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return quote with populated services and partsSupplies arrays', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const part = await createPartSupply();

      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = createRes.body.data.id as string;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 2 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: part.id, quantity: 3 })
        .expect(200);

      const res = await request(httpServer)
        .get(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.services).toHaveLength(1);
      expect(res.body.data.partsSupplies).toHaveLength(1);
      expect(res.body.data.services[0].id).toBe(service.id);
      expect(res.body.data.services[0].name).toBeDefined();
      expect(res.body.data.services[0].quantity).toBe(2);
      expect(res.body.data.partsSupplies[0].id).toBe(part.id);
      expect(res.body.data.partsSupplies[0].name).toBeDefined();
      expect(res.body.data.partsSupplies[0].sku).toBeDefined();
      expect(res.body.data.partsSupplies[0].quantity).toBe(3);
    });
  });

  // ─── POST /api/quotes/:id/services ───────────────────────────────────────────

  describe('POST /api/quotes/:id/services', () => {
    it('should add a service to the quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id as string;

      const res = await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      expect(res.body.data.servicesAmount).toBeGreaterThan(0);
      expect(res.body.data.totalAmount).toBeGreaterThan(0);
    });

    it('should return 422 when adding to a non-PENDING quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id as string;

      // Add a service first, then submit to move to SENT
      const serviceForSubmit = await createService();
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: serviceForSubmit.id, quantity: 1 })
        .expect(200);

      // Submit to move to SENT
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(200);

      const service = await createService();
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(409);
    });

    it('should return 404 when adding non-existent service', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .post(`/api/quotes/${createRes.body.data.id}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 1 })
        .expect(404);
    });

    it('should return 404 when quote does not exist', async () => {
      const service = await createService();
      await request(httpServer)
        .post(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(404);
    });

    it('should return 400 when quantity is zero', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .post(`/api/quotes/${createRes.body.data.id}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 0 })
        .expect(400);
    });

    it('should return 400 when serviceId is not a valid UUID', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .post(`/api/quotes/${createRes.body.data.id}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: 'not-a-uuid', quantity: 1 })
        .expect(400);
    });

    it('should return 409 when service is already in the quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(409);
    });
  });

  // ─── POST /api/quotes/:id/parts-supplies ──────────────────────────────────────────────

  describe('POST /api/quotes/:id/parts-supplies', () => {
    it('should add a part supply to the quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const part = await createPartSupply();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id as string;

      const res = await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: part.id, quantity: 2 })
        .expect(200);

      expect(res.body.data.partsAmount).toBeGreaterThan(0);
      expect(res.body.data.totalAmount).toBeGreaterThan(0);
    });

    it('should return 404 when adding non-existent part supply', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .post(`/api/quotes/${createRes.body.data.id}/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 1 })
        .expect(404);
    });

    it('should return 404 when quote does not exist', async () => {
      const part = await createPartSupply();
      await request(httpServer)
        .post(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: part.id, quantity: 1 })
        .expect(404);
    });

    it('should return 400 when quantity is zero', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const part = await createPartSupply();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .post(`/api/quotes/${createRes.body.data.id}/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: part.id, quantity: 0 })
        .expect(400);
    });

    it('should return 400 when partSupplyId is not a valid UUID', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .post(`/api/quotes/${createRes.body.data.id}/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: 'not-a-uuid', quantity: 1 })
        .expect(400);
    });

    it('should return 409 when part supply is already in the quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const part = await createPartSupply();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: part.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: part.id, quantity: 1 })
        .expect(409);
    });
  });

  // ─── POST /api/quotes/:id/submissions ─────────────────────────────────────────────

  describe('POST /api/quotes/:id/submissions', () => {
    it('should submit a quote and transition work order to AWAITING_APPROVAL', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id as string;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      const res = await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(200);

      expect(res.body.data.status).toBe('SENT');
    });

    it('should return 409 when submitting quote with no items', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .post(`/api/quotes/${createRes.body.data.id}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(409);
    });

    it('should transition work order from REJECTED back to AWAITING_APPROVAL when a new quote is submitted', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const firstService = await createService();
      const firstQuoteRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const firstQuoteId = firstQuoteRes.body.data.id as string;

      await request(httpServer)
        .post(`/api/quotes/${firstQuoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: firstService.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${firstQuoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(200);

      await request(httpServer)
        .patch(`/api/quotes/${firstQuoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'REJECTED', reason: 'Cliente pediu nova proposta' })
        .expect(200);

      const woAfterReject = await request(httpServer)
        .get(`/api/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(woAfterReject.body.data.status).toBe('REJECTED');

      const secondService = await createService();
      const secondQuoteRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const secondQuoteId = secondQuoteRes.body.data.id as string;

      await request(httpServer)
        .post(`/api/quotes/${secondQuoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: secondService.id, quantity: 1 })
        .expect(200);

      const submissionRes = await request(httpServer)
        .post(`/api/quotes/${secondQuoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(200);
      expect(submissionRes.body.data.status).toBe('SENT');

      const woAfterResubmit = await request(httpServer)
        .get(`/api/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(woAfterResubmit.body.data.status).toBe('AWAITING_APPROVAL');
    });
  });

  // ─── PATCH /api/quotes/:id (Approve/Reject) ───────────────────────────────────

  describe('PATCH /api/quotes/:id', () => {
    it('should approve a submitted quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id as string;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(200);

      const res = await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(200);

      expect(res.body.data.status).toBe('APPROVED');

      // Verify WorkOrder is updated
      const woRes = await request(httpServer)
        .get(`/api/work-orders/${workOrderId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(woRes.body.data.status).toBe('APPROVED');
      expect(woRes.body.data.approvedAt).toBeDefined();
      expect(woRes.body.data.approvedAt).not.toBeNull();
    });

    it('should reject a submitted quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id as string;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(200);

      const res = await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'REJECTED', reason: 'Preço fora do esperado' })
        .expect(200);

      expect(res.body.data.status).toBe('REJECTED');
    });

    it('should return 409 when rejecting without reason', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(200);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'REJECTED' })
        .expect(409);
    });

    it('should return 400 with invalid status', async () => {
      await request(httpServer)
        .patch(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'INVALID' })
        .expect(400);
    });

    it('should return 404 when quote does not exist', async () => {
      await request(httpServer)
        .patch(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(404);
    });

    it('should return 409 when stock is insufficient during approval', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const partRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Pneu',
          sku: `PNEU-${Date.now()}`,
          category: 'PART',
          unit: 'UN',
          costPrice: 200,
          salePrice: 400,
          stock: 1, // Low stock
          minStock: 0,
        })
        .expect(201);
      const partId = partRes.body.data.id;

      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: partId, quantity: 5 }) // Request more than available
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(409);
    });
  });

  // ─── PUT & DELETE services/parts-supplies ──────────────────────────────────────────────

  describe('Quote Items Management', () => {
    it('should update and remove items in a PENDING quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const part = await createPartSupply();

      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id;

      // Add
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: part.id, quantity: 1 })
        .expect(200);

      // Update
      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 3 })
        .expect(200);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 5 })
        .expect(200);

      // Remove
      await request(httpServer)
        .delete(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      await request(httpServer)
        .delete(`/api/quotes/${quoteId}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);
    });

    it('should return 400 when updating service item with quantity zero', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 0 })
        .expect(400);
    });

    it('should return 400 when updating part supply item with quantity zero', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const part = await createPartSupply();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ partSupplyId: part.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 0 })
        .expect(400);
    });

    it('should return 404 when updating non-existent item', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .patch(
          `/api/quotes/${createRes.body.data.id}/services/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`,
        )
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(404);
    });

    it('should return 404 when removing non-existent item', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .delete(
          `/api/quotes/${createRes.body.data.id}/parts-supplies/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`,
        )
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });
  });
  describe('GET /api/quotes/:id/decisions', () => {
    it('should approve quote via email link and status history changedBy is null', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      const token = jwtService.sign(
        { quoteId, action: 'approve', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      const res = await request(httpServer)
        .get(`/api/quotes/${quoteId}/decisions`)
        .query({ token })
        .expect(200);

      expect(res.body.data.status).toBe('APPROVED');

      const historyRes = await request(httpServer)
        .get(`/api/work-orders/${workOrderId}/status-history`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      const approvalEntry = (
        historyRes.body.data as Array<{ newStatus: string; changedBy: unknown }>
      ).find((e) => e.newStatus === 'APPROVED');
      expect(approvalEntry).toBeDefined();
      expect(approvalEntry!.changedBy).toBeNull();
    });

    it('should reject quote via email link', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      const token = jwtService.sign(
        { quoteId, action: 'reject', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      const res = await request(httpServer)
        .get(`/api/quotes/${quoteId}/decisions`)
        .query({ token })
        .expect(200);

      expect(res.body.data.status).toBe('REJECTED');
    });

    it('should return 401 for invalid token', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .get(`/api/quotes/${createRes.body.data.id}/decisions`)
        .query({ token: 'invalid-token' })
        .expect(401);
    });

    it('should return 401 when token payload type is invalid', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const invalidToken = jwtService.sign(
        { quoteId: createRes.body.data.id, action: 'approve', type: 'wrong-type' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .get(`/api/quotes/${createRes.body.data.id}/decisions`)
        .query({ token: invalidToken })
        .expect(401);
    });

    it('should return 401 when quoteId in token is different from route', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const anotherQuoteId = '00000000-0000-0000-0000-000000000000';
      const invalidToken = jwtService.sign(
        { quoteId: anotherQuoteId, action: 'approve', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .get(`/api/quotes/${createRes.body.data.id}/decisions`)
        .query({ token: invalidToken })
        .expect(401);
    });

    it('should return 409 when attempting email decision on a non-submitted quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const token = jwtService.sign(
        { quoteId: createRes.body.data.id, action: 'reject', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .get(`/api/quotes/${createRes.body.data.id}/decisions`)
        .query({ token })
        .expect(409);
    });

    it('should throw ResourceNotFoundException when quote does not exist (approve)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const token = jwtService.sign(
        { quoteId: fakeId, action: 'approve', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer).get(`/api/quotes/${fakeId}/decisions`).query({ token }).expect(404);
    });

    it('should throw ResourceNotFoundException when quote does not exist (reject)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const token = jwtService.sign(
        { quoteId: fakeId, action: 'reject', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer).get(`/api/quotes/${fakeId}/decisions`).query({ token }).expect(404);
    });

    it('should treat unrecognized action in token as reject on a submitted quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = createRes.body.data.id;
      const service = await createService();

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      const token = jwtService.sign(
        { quoteId, action: 'invalid-action', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      const res = await request(httpServer)
        .get(`/api/quotes/${quoteId}/decisions`)
        .query({ token })
        .expect(200);

      expect(res.body.data.status).toBe('REJECTED');
    });
  });

  // ─── PATCH /api/quotes/:id ──────────────────────────────────────────────────

  describe('PATCH /api/quotes/:id', () => {
    it('should approve a quote manually', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id;
      const service = await createService();

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      const res = await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(200);

      expect(res.body.data.status).toBe('APPROVED');
    });

    it('should reject a quote manually with reason', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id;
      const service = await createService();

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      const res = await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'REJECTED', reason: 'Muito caro' })
        .expect(200);

      expect(res.body.data.status).toBe('REJECTED');
    });

    it('should return 400 when rejecting without reason', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .patch(`/api/quotes/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'REJECTED' })
        .expect(409); // BusinessRuleViolationException mapped to 409
    });

    it('should return 404 when quote does not exist', async () => {
      await request(httpServer)
        .patch('/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(404);
    });
  });

  // ─── Extra Coverage Scenarios ──────────────────────────────────────────────

  describe('Extra Coverage Scenarios', () => {
    it('should return 404 when adding service to non-existent quote', async () => {
      const service = await createService();
      await request(httpServer)
        .post(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(404);
    });

    it('should return 404 when adding non-existent service to quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      await request(httpServer)
        .post(`/api/quotes/${createRes.body.data.id}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 1 })
        .expect(404);
    });

    it('should return 404 when removing service from non-existent quote', async () => {
      await request(httpServer)
        .delete(
          `/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/services/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`,
        )
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 404 when removing part from non-existent quote', async () => {
      await request(httpServer)
        .delete(
          `/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/parts-supplies/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`,
        )
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 404 when submitting non-existent quote', async () => {
      await request(httpServer)
        .post('/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/submissions')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 409 when submitting a REJECTED quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = createRes.body.data.id;
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      // Submit first to move to SENT
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      // Reject it
      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'REJECTED', reason: 'Test' })
        .expect(200);

      // Try to submit again
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(409);
    });

    it('should return 400 when manual status update is not APPROVED or REJECTED', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      await request(httpServer)
        .patch(`/api/quotes/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'SENT' })
        .expect(400);
    });

    it('should return 404 when service is not associated with quote during removal', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const service = await createService();
      await request(httpServer)
        .delete(`/api/quotes/${createRes.body.data.id}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 404 when part is not associated with quote during update', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const part = await createPartSupply();
      await request(httpServer)
        .patch(`/api/quotes/${createRes.body.data.id}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 5 })
        .expect(404);
    });

    it('should return 409 when attempting email decision on a draft (non-submitted) quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = createRes.body.data.id;
      const token = jwtService.sign(
        { quoteId, action: 'reject', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .get(`/api/quotes/${quoteId}/decisions`)
        .query({ token })
        .expect(409);
    });

    it('should return 400 when token query param is missing', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = createRes.body.data.id;

      await request(httpServer).get(`/api/quotes/${quoteId}/decisions`).expect(400);
    });

    it('should return 404 when updating service in non-existent quote', async () => {
      const service = await createService();
      await request(httpServer)
        .patch(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 5 })
        .expect(404);
    });

    it('should return 404 when updating part in non-existent quote', async () => {
      const part = await createPartSupply();
      await request(httpServer)
        .patch(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 5 })
        .expect(404);
    });

    it('should sanitize strings with null characters (SanitizeStringsPipe)', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const notes = 'Test\0Notes';
      const sanitizedNotes = 'TestNotes';

      const res = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId, notes })
        .expect(201);

      expect(res.body.data.notes).toBe(sanitizedNotes);
    });

    it('should reject a quote via email decision (QuoteDecisionAction.REJECT)', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id;
      const service = await createService();

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      const token = jwtService.sign(
        { quoteId, action: 'reject', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .get(`/api/quotes/${quoteId}/decisions`)
        .query({ token })
        .expect(200);

      const updatedQuote = await ctx.prisma.quote.findUnique({ where: { id: quoteId } });
      expect(updatedQuote?.status).toBe('REJECTED');
    });

    describe('Retrieval', () => {
      it('should list all quotes paginated (GET /api/quotes)', async () => {
        const wo = await createWorkOrderInDiagnosis();
        await request(httpServer)
          .post('/api/quotes')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .send({ workOrderId: wo.workOrderId })
          .expect(201);

        const res = await request(httpServer)
          .get('/api/quotes')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .expect(200);

        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.page).toBe(1);
        expect(res.body.pagination.limit).toBe(10);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].workOrder).toBeDefined();
        expect(res.body.data[0].workOrder.id).toBeDefined();
        expect((res.body.data[0] as Record<string, unknown>)['workOrderId']).toBeUndefined();
        expect(res.body.data[0].services).toBeUndefined();
        expect(res.body.data[0].partsSupplies).toBeUndefined();
      });

      it('should filter quotes by workOrderId (GET /api/quotes?workOrderId=...)', async () => {
        const wo1 = await createWorkOrderInDiagnosis();
        const _wo2 = await createWorkOrderInDiagnosis();

        await request(httpServer)
          .post('/api/quotes')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .send({ workOrderId: wo1.workOrderId })
          .expect(201);

        const res = await request(httpServer)
          .get(`/api/quotes?workOrderId=${wo1.workOrderId}`)
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].workOrder.id).toBe(wo1.workOrderId);
      });

      it('should filter quotes by status (GET /api/quotes?status=...)', async () => {
        const wo = await createWorkOrderInDiagnosis();
        const quoteRes = await request(httpServer)
          .post('/api/quotes')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .send({ workOrderId: wo.workOrderId })
          .expect(201);

        const quoteId = quoteRes.body.data.id;

        // By default it's PENDING
        const resPending = await request(httpServer)
          .get('/api/quotes?status=PENDING')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .expect(200);

        const hasPending = resPending.body.data.some((q: { id: string }) => q.id === quoteId);
        expect(hasPending).toBe(true);

        const resSent = await request(httpServer)
          .get('/api/quotes?status=SENT')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .expect(200);

        const hasSent = resSent.body.data.some((q: { id: string }) => q.id === quoteId);
        expect(hasSent).toBe(false);
      });

      it('should filter quotes by status without page and limit (GET /api/quotes?status=...)', async () => {
        const res = await request(httpServer)
          .get('/api/quotes?status=PENDING')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .expect(200);

        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.page).toBe(1);
        expect(res.body.pagination.limit).toBe(10);
      });

      it('should list quotes of a work order (GET /api/work-orders/:id/quotes)', async () => {
        const wo = await createWorkOrderInDiagnosis();
        await request(httpServer)
          .post('/api/quotes')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .send({ workOrderId: wo.workOrderId })
          .expect(201);

        const res = await request(httpServer)
          .get(`/api/work-orders/${wo.workOrderId}/quotes`)
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .expect(200);

        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].workOrder).toBeDefined();
        expect(res.body.data[0].workOrder.id).toBe(wo.workOrderId);
        expect((res.body.data[0] as Record<string, unknown>)['workOrderId']).toBeUndefined();
        expect(res.body.data[0].services).toBeUndefined();
        expect(res.body.data[0].partsSupplies).toBeUndefined();
      });

      it('should return 404 when listing quotes for non-existent work order', async () => {
        const invalidId = 'f9b6e8e0-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
        await request(httpServer)
          .get(`/api/work-orders/${invalidId}/quotes`)
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .expect(404);
      });
    });
  });

  // ─── Concorrência — Optimistic Locking ──────────────────────────────────────

  describe('Quote approval — Concurrency (optimistic locking)', () => {
    async function setupSentQuote() {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();

      const quoteRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);
      const quoteId = quoteRes.body.data.id as string;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ serviceId: service.id, quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      return { quoteId, workOrderId };
    }

    it('should allow exactly one of two concurrent APPROVE requests to succeed', async () => {
      const { quoteId } = await setupSentQuote();

      const [res1, res2] = await Promise.all([
        request(httpServer)
          .patch(`/api/quotes/${quoteId}`)
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .send({ status: 'APPROVED' }),
        request(httpServer)
          .patch(`/api/quotes/${quoteId}`)
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .send({ status: 'APPROVED' }),
      ]);

      // Neither may be a server error (500)
      expect([200, 409]).toContain(res1.status);
      expect([200, 409]).toContain(res2.status);

      // Exactly one succeeds; the other gets ConcurrencyException or BusinessRuleViolation (both 409)
      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);

      // DB state must reflect a single approval
      const record = await ctx.prisma.quote.findUnique({ where: { id: quoteId } });
      expect(record!.status).toBe('APPROVED');
    });

    it('should return 409 when approving an already-approved quote (deterministic)', async () => {
      const { quoteId } = await setupSentQuote();

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(200);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(409);
    });

    it('should return 409 when rejecting an already-rejected quote (deterministic)', async () => {
      const { quoteId } = await setupSentQuote();

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'REJECTED', reason: 'Preço elevado' })
        .expect(200);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'REJECTED', reason: 'Outro motivo' })
        .expect(409);
    });

    it('should reject stale-version update with P2025 (direct optimistic lock verification)', async () => {
      const { quoteId } = await setupSentQuote();

      // Advance version via one approval (version 0 → N)
      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(200);

      // Simulate what the losing concurrent transaction would attempt
      await expect(
        ctx.prisma.quote.update({
          where: { id: quoteId, version: 0 }, // stale — version advanced past 0
          data: { status: 'REJECTED', version: { increment: 1 } },
        }),
      ).rejects.toMatchObject({ code: 'P2025' });
    });
  });
});
