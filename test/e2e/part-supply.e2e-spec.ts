import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { AuthTokens, registerAndLogin } from '../helpers/auth.helper';

describe('PartSupply (E2E)', () => {
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

  const validPartSupply = {
    name: 'Filtro de Óleo',
    description: 'Filtro para motor 1.0',
    sku: 'FO-001',
    category: 'PART',
    unit: 'UN',
    costPrice: 25.0,
    salePrice: 45.0,
    stock: 10,
    minStock: 2,
  };

  // ─── POST /api/parts-supplies ─────────────────────────────────────────────

  describe('POST /api/parts-supplies', () => {
    it('should create a part/supply and return 201', async () => {
      const res = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validPartSupply)
        .expect(201);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Filtro de Óleo',
          sku: 'FO-001',
          category: 'PART',
          unit: 'UN',
          stock: 10,
          isActive: true,
        }),
      );
    });

    it('should create without optional fields', async () => {
      const res = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Óleo Motor 5W30',
          sku: 'OM-5W30',
          category: 'SUPPLY',
          unit: 'L',
          costPrice: 30.0,
          salePrice: 55.0,
        })
        .expect(201);

      expect(res.body.data.stock).toBe(0);
      expect(res.body.data.minStock).toBe(0);
      expect(res.body.data.description).toBeNull();
    });

    it('should return 409 when creating part/supply with duplicate SKU', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validPartSupply)
        .expect(201);

      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validPartSupply, name: 'Outro Filtro' })
        .expect(409);
    });

    it('should return 400 with invalid body', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: '', sku: 'X', costPrice: -1, salePrice: 0 })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(httpServer).post('/api/parts-supplies').send(validPartSupply).expect(401);
    });

    it('should return 403 for non-admin role', async () => {
      const mechanic = await registerAndLogin(httpServer, {
        name: 'Mechanic',
        email: 'mechanic@e2e.test',
        role: 'MECHANIC',
      });

      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${mechanic.accessToken}`)
        .send(validPartSupply)
        .expect(403);
    });
  });

  // ─── GET /api/parts-supplies ──────────────────────────────────────────────

  describe('GET /api/parts-supplies', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 12; i++) {
        await request(httpServer)
          .post('/api/parts-supplies')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .send({
            name: `Peça ${i}`,
            sku: `SKU-${String(i).padStart(3, '0')}`,
            category: i % 2 === 0 ? 'SUPPLY' : 'PART',
            unit: 'UN',
            costPrice: 10 + i,
            salePrice: 20 + i,
            stock: i,
            minStock: 5,
          })
          .expect(201);
      }
    });

    it('should return paginated items with defaults (page=1, limit=10)', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(10);
      expect(res.body.totalRecords).toBe(12);
      expect(res.body.totalPages).toBe(2);
    });

    it('should return second page', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies?page=2&limit=10')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
    });

    it('should filter by name', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies?name=Peça 1')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.totalRecords).toBeGreaterThanOrEqual(1);
      res.body.data.forEach((item: { name: string }) => {
        expect(item.name).toContain('Peça 1');
      });
    });

    it('should filter by SKU', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies?sku=SKU-001')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.totalRecords).toBe(1);
      expect(res.body.data[0].sku).toBe('SKU-001');
    });

    it('should filter by category', async () => {
      const res = await request(httpServer)
        .get('/api/parts-supplies?category=PART')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      res.body.data.forEach((item: { category: string }) => {
        expect(item.category).toBe('PART');
      });
    });

    it('should filter low stock items (stock <= minStock)', async () => {
      // Items 1-5 have stock <= 5 (minStock=5)
      const res = await request(httpServer)
        .get('/api/parts-supplies?lowStock=true&limit=20')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.totalRecords).toBeGreaterThanOrEqual(1);
      res.body.data.forEach((item: { stock: number; minStock: number }) => {
        expect(item.stock).toBeLessThanOrEqual(item.minStock);
      });
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/parts-supplies').expect(401);
    });
  });

  // ─── GET /api/parts-supplies/:id ─────────────────────────────────────────

  describe('GET /api/parts-supplies/:id', () => {
    it('should return a part/supply by id', async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validPartSupply)
        .expect(201);

      const partId = createRes.body.data.id;

      const res = await request(httpServer)
        .get(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(partId);
      expect(res.body.data.name).toBe('Filtro de Óleo');
      expect(res.body.data.sku).toBe('FO-001');
    });

    it('should return 404 for non-existent id', async () => {
      await request(httpServer)
        .get('/api/parts-supplies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(httpServer)
        .get('/api/parts-supplies/not-a-uuid')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(400);
    });
  });

  // ─── PUT /api/parts-supplies/:id ─────────────────────────────────────────

  describe('PUT /api/parts-supplies/:id', () => {
    let partId: string;

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validPartSupply)
        .expect(201);
      partId = createRes.body.data.id;
    });

    it('should update part/supply data', async () => {
      const res = await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Filtro de Óleo Premium',
          salePrice: 59.9,
        })
        .expect(200);

      expect(res.body.data.name).toBe('Filtro de Óleo Premium');
      expect(res.body.data.salePrice).toBe(59.9);
    });

    it('should deactivate a part/supply', async () => {
      const res = await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.data.isActive).toBe(false);
    });

    it('should return 409 when updating to a duplicate SKU', async () => {
      await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ ...validPartSupply, name: 'Outro Item', sku: 'FO-002' })
        .expect(201);

      await request(httpServer)
        .put(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ sku: 'FO-002' })
        .expect(409);
    });

    it('should return 404 for non-existent part/supply', async () => {
      await request(httpServer)
        .put('/api/parts-supplies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });
  });

  // ─── PATCH /api/parts-supplies/:id ───────────────────────────────────────

  describe('PATCH /api/parts-supplies/:id', () => {
    let partId: string;

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validPartSupply)
        .expect(201);
      partId = createRes.body.data.id;
    });

    it('should add stock with ENTRY movement', async () => {
      const res = await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ type: 'ENTRY', quantity: 5, reason: 'Reposição recebida' })
        .expect(200);

      expect(res.body.data.stock).toBe(15);
    });

    it('should reduce stock with EXIT movement', async () => {
      const res = await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ type: 'EXIT', quantity: 3, reason: 'Saída por OS' })
        .expect(200);

      expect(res.body.data.stock).toBe(7);
    });

    it('should adjust stock with ADJUSTMENT movement', async () => {
      const res = await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ type: 'ADJUSTMENT', quantity: 2, reason: 'Ajuste de inventário' })
        .expect(200);

      expect(res.body.data.stock).toBe(12);
    });

    it('should return 409 when EXIT quantity exceeds available stock', async () => {
      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ type: 'EXIT', quantity: 999 })
        .expect(409);
    });

    it('should return 404 for non-existent part/supply', async () => {
      await request(httpServer)
        .patch('/api/parts-supplies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ type: 'ENTRY', quantity: 1 })
        .expect(404);
    });

    it('should return 400 for invalid movement type', async () => {
      await request(httpServer)
        .patch(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ type: 'INVALID', quantity: 1 })
        .expect(400);
    });
  });

  // ─── DELETE /api/parts-supplies/:id ──────────────────────────────────────

  describe('DELETE /api/parts-supplies/:id', () => {
    it('should soft-delete a part/supply and return 204', async () => {
      const createRes = await request(httpServer)
        .post('/api/parts-supplies')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validPartSupply)
        .expect(201);

      const partId = createRes.body.data.id;

      await request(httpServer)
        .delete(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      await request(httpServer)
        .get(`/api/parts-supplies/${partId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent part/supply', async () => {
      await request(httpServer)
        .delete('/api/parts-supplies/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(httpServer)
        .delete('/api/parts-supplies/not-a-uuid')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(400);
    });
  });
});
