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
          workOrderId,
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
  });

  // ─── GET /api/quotes/:id ─────────────────────────────────────────────────────

  describe('GET /api/quotes/:id', () => {
    it('should return a quote by id', async () => {
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
    });

    it('should return 422 for non-existent quote', async () => {
      await request(httpServer)
        .get('/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
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
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .post(`/api/quotes/${quoteId}/services/${serviceForSubmit.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      // Submit to move to SENT
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({})
        .expect(200);

      const service = await createService();
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .post(`/api/quotes/${createRes.body.data.id}/services/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(404);
    });

    it('should return 404 when quote does not exist', async () => {
      const service = await createService();
      await request(httpServer)
        .post(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(404);
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
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .post(`/api/quotes/${quoteId}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 2 })
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
        .post(`/api/quotes/${createRes.body.data.id}/parts-supplies/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(404);
    });

    it('should return 404 when quote does not exist', async () => {
      const part = await createPartSupply();
      await request(httpServer)
        .post(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(404);
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
        .post(`/api/quotes/${quoteId}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .post(`/api/quotes/${quoteId}/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 5 }) // Request more than available
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
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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

    it('should return 404 when updating non-existent item', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      await request(httpServer)
        .patch(`/api/quotes/${createRes.body.data.id}/services/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
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
        .delete(`/api/quotes/${createRes.body.data.id}/parts-supplies/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });
  });
  describe('PATCH /api/quotes/:id/decisions', () => {
    it('should approve quote via email link', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const quoteId = createRes.body.data.id;

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .patch(`/api/quotes/${quoteId}/decisions`)
        .query({ action: 'approve', token })
        .expect(200);

      expect(res.body.data.status).toBe('APPROVED');
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
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .patch(`/api/quotes/${quoteId}/decisions`)
        .query({ action: 'reject', token })
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
        .patch(`/api/quotes/${createRes.body.data.id}/decisions`)
        .query({ action: 'approve', token: 'invalid-token' })
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
        .patch(`/api/quotes/${createRes.body.data.id}/decisions`)
        .query({ action: 'approve', token: invalidToken })
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
        .patch(`/api/quotes/${createRes.body.data.id}/decisions`)
        .query({ action: 'approve', token: invalidToken })
        .expect(401);
    });

    it('should return 401 when action in token is different from body', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ workOrderId })
        .expect(201);

      const invalidToken = jwtService.sign(
        { quoteId: createRes.body.data.id, action: 'reject', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .patch(`/api/quotes/${createRes.body.data.id}/decisions`)
        .query({ action: 'approve', token: invalidToken })
        .expect(401);
    });

    it('should throw ResourceNotFoundException when quote does not exist (approve)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const token = jwtService.sign(
        { quoteId: fakeId, action: 'approve', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .patch(`/api/quotes/${fakeId}/decisions`)
        .query({ action: 'approve', token })
        .expect(404);
    });

    it('should throw ResourceNotFoundException when quote does not exist (reject)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const token = jwtService.sign(
        { quoteId: fakeId, action: 'reject', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .patch(`/api/quotes/${fakeId}/decisions`)
        .query({ action: 'reject', token })
        .expect(404);
    });

    it('should throw ResourceNotFoundException when work order does not exist (approve)', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;

      await ctx.prisma.workOrder.delete({ where: { id: workOrderId } });

      const token = jwtService.sign(
        { quoteId, action: 'approve', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .query({ action: 'approve', token })
        .expect(404);
    });

    it('should throw ResourceNotFoundException when work order does not exist (reject)', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;

      await ctx.prisma.workOrder.delete({ where: { id: workOrderId } });

      const token = jwtService.sign(
        { quoteId, action: 'reject', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .query({ action: 'reject', token })
        .expect(404);
    });


    it('should throw BadRequestException when action is invalid', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;
      const service = await createService();

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      await request(httpServer).post(`/api/quotes/${quoteId}/submissions`).set('Authorization', `Bearer ${adminAuth.accessToken}`).expect(200);

      const token = jwtService.sign(
        { quoteId, action: 'invalid-action', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .query({ action: 'invalid-action', token })
        .expect(400);
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
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
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
        .post(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(404);
    });

    it('should return 404 when adding non-existent service to quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      await request(httpServer)
        .post(`/api/quotes/${createRes.body.data.id}/services/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(404);
    });

    it('should return 404 when removing service from non-existent quote', async () => {
      await request(httpServer)
        .delete(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/services/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 404 when removing part from non-existent quote', async () => {
      await request(httpServer)
        .delete(`/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/parts-supplies/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 404 when submitting non-existent quote', async () => {
      await request(httpServer)
        .post('/api/quotes/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/submissions')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 404 when work order not found during submission', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;
      await request(httpServer).post(`/api/quotes/${quoteId}/services/${service.id}`).set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ quantity: 1 }).expect(200);

      // Manually delete WO
      await ctx.prisma.workOrder.delete({ where: { id: workOrderId } });

      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 409 when submitting a REJECTED quote', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;
      await request(httpServer).post(`/api/quotes/${quoteId}/services/${service.id}`).set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ quantity: 1 }).expect(200);

      // Submit first to move to SENT
      await request(httpServer).post(`/api/quotes/${quoteId}/submissions`).set('Authorization', `Bearer ${adminAuth.accessToken}`).expect(200);

      // Reject it
      await request(httpServer).patch(`/api/quotes/${quoteId}`).set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ status: 'REJECTED', reason: 'Test' }).expect(200);

      // Try to submit again
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/submissions`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(409);
    });

    it('should return 404 when work order not found during manual decision', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;
      const service = await createService();
      await request(httpServer).post(`/api/quotes/${quoteId}/services/${service.id}`).set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ quantity: 1 }).expect(200);
      await request(httpServer).post(`/api/quotes/${quoteId}/submissions`).set('Authorization', `Bearer ${adminAuth.accessToken}`).expect(200);

      await ctx.prisma.workOrder.delete({ where: { id: workOrderId } });

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(404);
    });

    it('should return 400 when manual status update is not APPROVED or REJECTED', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      await request(httpServer)
        .patch(`/api/quotes/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'SENT' })
        .expect(400);
    });

    it('should return 404 when service is not associated with quote during removal', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const service = await createService();
      await request(httpServer)
        .delete(`/api/quotes/${createRes.body.data.id}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 404 when part is not associated with quote during update', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const part = await createPartSupply();
      await request(httpServer)
        .patch(`/api/quotes/${createRes.body.data.id}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 5 })
        .expect(404);
    });


    it('should release stock reservations and decrement reserved stock during rejection (line 43 coverage)', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const part = await createPartSupply();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;

      await request(httpServer).post(`/api/quotes/${quoteId}/parts-supplies/${part.id}`).set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ quantity: 5 }).expect(200);

      // Manually create a reservation for this work order to test the cleanup during rejection
      await ctx.prisma.stockReservation.create({
        data: {
          partSupplyId: part.id,
          workOrderId,
          quantity: 5,
        }
      });
      // And manually increment the reserved stock
      await ctx.prisma.partSupply.update({
        where: { id: part.id },
        data: { reservedStock: { increment: 5 } }
      });

      await request(httpServer).post(`/api/quotes/${quoteId}/submissions`).set('Authorization', `Bearer ${adminAuth.accessToken}`).expect(200);

      // Reject it
      await request(httpServer)
        .patch(`/api/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ status: 'REJECTED', reason: 'Changed mind' })
        .expect(200);

      const updatedPart = await ctx.prisma.partSupply.findUnique({ where: { id: part.id } });
      expect(updatedPart?.reservedStock).toBe(0);
    });

    it('should return 400 for invalid action in email decision', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;
      const token = jwtService.sign(
        { quoteId, action: 'invalid', type: 'quote-email-decision' },
        { secret, expiresIn: '7d' },
      );

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .query({ action: 'invalid', token })
        .expect(400);
    });

    it('should return 400 when action query param is completely missing or invalid', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .query({ action: 'WRONG', token: 'some-token' })
        .expect(400);
    });

    it('should return 404 when work order not found during service update', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;
      
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      // Manually delete WO
      await ctx.prisma.workOrder.delete({ where: { id: workOrderId } });

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 5 })
        .expect(404);
    });

    it('should return 404 when work order not found during part update', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const part = await createPartSupply();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;
      
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      // Manually delete WO
      await ctx.prisma.workOrder.delete({ where: { id: workOrderId } });

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 5 })
        .expect(404);
    });

    it('should throw error when QUOTE_DECISION_TOKEN_SECRET is not defined during submission', async () => {
      const { workOrderId } = await createWorkOrderInDiagnosis();
      const service = await createService();
      const createRes = await request(httpServer).post('/api/quotes').set('Authorization', `Bearer ${adminAuth.accessToken}`).send({ workOrderId }).expect(201);
      const quoteId = createRes.body.data.id;
      
      await request(httpServer)
        .post(`/api/quotes/${quoteId}/services/${service.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ quantity: 1 })
        .expect(200);

      const originalSecret = process.env.QUOTE_DECISION_TOKEN_SECRET;
      delete process.env.QUOTE_DECISION_TOKEN_SECRET;

      try {
        await request(httpServer)
          .post(`/api/quotes/${quoteId}/submissions`)
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .expect(500);
      } finally {
        process.env.QUOTE_DECISION_TOKEN_SECRET = originalSecret;
      }
    });
  });
});
