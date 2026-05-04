import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { AuthTokens, registerAndLogin } from '../helpers/auth.helper';

describe('Stock (E2E)', () => {
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

  async function createPartSupply(name: string, sku: string) {
    const res = await request(httpServer)
      .post('/api/parts-supplies')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        name,
        sku,
        category: 'PART',
        unit: 'UN',
        costPrice: 10,
        salePrice: 20,
        stock: 100,
        minStock: 10,
      })
      .expect(201);
    return res.body.data;
  }

  describe('GET /api/stock-movements', () => {
    it('should list stock movements with filters', async () => {
      const part = await createPartSupply('Peça Teste', 'TEST-001');

      // Create a movement via PATCH /api/parts-supplies/:id
      await request(httpServer)
        .patch(`/api/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ type: 'ENTRY', quantity: 10, reason: 'Test entry' })
        .expect(200);

      const res = await request(httpServer)
        .get('/api/stock-movements')
        .query({ partSupplyId: part.id, type: 'ENTRY' })
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].type).toBe('ENTRY');
    });

    it('should use default pagination (page=1, limit=10) when not provided', async () => {
      const res = await request(httpServer)
        .get('/api/stock-movements')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should filter by date range', async () => {
      const part = await createPartSupply('Peça Teste 2', 'TEST-002');
      await request(httpServer)
        .patch(`/api/parts-supplies/${part.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ type: 'EXIT', quantity: 5, reason: 'Test exit' })
        .expect(200);

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(httpServer)
        .get('/api/stock-movements')
        .query({
          startDate: today.toISOString().split('T')[0],
          endDate: tomorrow.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 200 and empty data when partSupplyId does not exist', async () => {
      const res = await request(httpServer)
        .get('/api/stock-movements')
        .query({ partSupplyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('GET /api/stock-reservations', () => {
    it('should list stock reservations', async () => {
      const part = await createPartSupply('Peça Reservada', 'RES-001');

      // Reservations are usually created via approved quotes.
      // We'll manually inject one for simplicity or use the quote flow.
      // Using manual inject via prisma to save time in E2E.
      const customer = await ctx.prisma.customer.create({
        data: { name: 'Test', document: '12345678909', type: 'INDIVIDUAL', email: 'test@stock.com', phone: '123' }
      });
      const vehicle = await ctx.prisma.vehicle.create({
        data: { customerId: customer.id, plate: 'STK-0001', brand: 'Test', model: 'Test', year: 2020 }
      });
      const workOrder = await ctx.prisma.workOrder.create({
        data: { customerId: customer.id, vehicleId: vehicle.id, number: 'STOCK', status: 'IN_PROGRESS' }
      });

      await ctx.prisma.stockReservation.create({
        data: {
          partSupplyId: part.id,
          workOrderId: workOrder.id,
          quantity: 5,
        }
      });

      const res = await request(httpServer)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].partSupply.id).toBe(part.id);
    });

    it('should use default pagination (page=1, limit=10) when not provided', async () => {
      const res = await request(httpServer)
        .get('/api/stock-reservations')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should filter stock reservations by partSupplyId and workOrderId', async () => {
      const part = await createPartSupply('Peça Filtrar', 'FILT-001');
      const customer = await ctx.prisma.customer.create({
        data: { name: 'Test Filter', document: '12345678900', type: 'INDIVIDUAL', email: 'filter@stock.com', phone: '123' }
      });
      const vehicle = await ctx.prisma.vehicle.create({
        data: { customerId: customer.id, plate: 'FLT-0001', brand: 'Test', model: 'Test', year: 2020 }
      });
      const workOrder = await ctx.prisma.workOrder.create({
        data: { customerId: customer.id, vehicleId: vehicle.id, number: 'FILTER', status: 'IN_PROGRESS' }
      });

      await ctx.prisma.stockReservation.create({
        data: {
          partSupplyId: part.id,
          workOrderId: workOrder.id,
          quantity: 10,
        }
      });

      // Filter by partSupplyId
      let res = await request(httpServer)
        .get('/api/stock-reservations')
        .query({ partSupplyId: part.id })
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(res.body.data.length).toBe(1);

      // Filter by workOrderId
      res = await request(httpServer)
        .get('/api/stock-reservations')
        .query({ workOrderId: workOrder.id })
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(res.body.data.length).toBe(1);

      // Filter by both
      res = await request(httpServer)
        .get('/api/stock-reservations')
        .query({ partSupplyId: part.id, workOrderId: workOrder.id })
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('GET /api/stock-movements (Advanced)', () => {
    it('should filter stock movements by workOrderId', async () => {
      const part = await createPartSupply('Peça Mov', 'MOV-001');
      const customer = await ctx.prisma.customer.create({
        data: { name: 'Test Mov', document: '09876543211', type: 'INDIVIDUAL', email: 'mov@stock.com', phone: '123' }
      });
      const vehicle = await ctx.prisma.vehicle.create({
        data: { customerId: customer.id, plate: 'MOV-0001', brand: 'Test', model: 'Test', year: 2020 }
      });
      const workOrder = await ctx.prisma.workOrder.create({
        data: { customerId: customer.id, vehicleId: vehicle.id, number: 'MOVE-1', status: 'IN_PROGRESS' }
      });

      await ctx.prisma.stockMovement.create({
        data: {
          partSupplyId: part.id,
          workOrderId: workOrder.id,
          quantity: 2,
          type: 'EXIT',
          reason: 'Test work order filter',
        }
      });

      const res = await request(httpServer)
        .get('/api/stock-movements')
        .query({ workOrderId: workOrder.id })
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].workOrder.id).toBe(workOrder.id);
    });
  });
});
