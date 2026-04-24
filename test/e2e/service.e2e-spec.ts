import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { AuthTokens, registerAndLogin } from '../helpers/auth.helper';

describe('Service (E2E)', () => {
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

  const validService = {
    name: 'Troca de Óleo',
    description: 'Troca completa com filtro',
    basePrice: 129.9,
    estimatedTimeMin: 60,
  };

  // ─── POST /api/services ───────────────────────────────────────────────────

  describe('POST /api/services', () => {
    it('should create a service and return 201', async () => {
      const res = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validService)
        .expect(201);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Troca de Óleo',
          description: 'Troca completa com filtro',
          isActive: true,
        }),
      );
    });

    it('should create a service without optional description', async () => {
      const res = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Alinhamento',
          basePrice: 80,
          estimatedTimeMin: 30,
        })
        .expect(201);

      expect(res.body.data.name).toBe('Alinhamento');
      expect(res.body.data.description).toBeNull();
    });

    it('should return 409 when creating service with duplicate name', async () => {
      await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validService)
        .expect(201);

      await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validService)
        .expect(409);
    });

    it('should return 400 with invalid body', async () => {
      await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'ab', basePrice: -10, estimatedTimeMin: 0 })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(httpServer).post('/api/services').send(validService).expect(401);
    });

    it('should return 403 for non-admin role', async () => {
      const mechanic = await registerAndLogin(httpServer, {
        name: 'Mechanic',
        email: 'mechanic@e2e.test',
        role: 'MECHANIC',
      });

      await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${mechanic.accessToken}`)
        .send(validService)
        .expect(403);
    });
  });

  // ─── GET /api/services ────────────────────────────────────────────────────

  describe('GET /api/services', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 15; i++) {
        await request(httpServer)
          .post('/api/services')
          .set('Authorization', `Bearer ${adminAuth.accessToken}`)
          .send({
            name: `Serviço ${i}`,
            basePrice: 100 + i,
            estimatedTimeMin: 30 + i,
          })
          .expect(201);
      }
    });

    it('should return paginated services with defaults (page=1, pageSize=10)', async () => {
      const res = await request(httpServer)
        .get('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(10);
      expect(res.body.pagination.totalRecords).toBe(15);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('should return second page', async () => {
      const res = await request(httpServer)
        .get('/api/services?page=2&limit=10')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(5);
    });

    it('should respect custom pageSize', async () => {
      const res = await request(httpServer)
        .get('/api/services?page=1&limit=5')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('should return all services when active is not specified', async () => {
      const createRes = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Inativo Service',
          basePrice: 50,
          estimatedTimeMin: 20,
        })
        .expect(201);

      await request(httpServer)
        .patch(`/api/services/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(200);

      const res = await request(httpServer)
        .get('/api/services?page=1&limit=100')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBe(16);
    });

    it('should return only active services when active=true', async () => {
      const createRes = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Inativo Service',
          basePrice: 50,
          estimatedTimeMin: 20,
        })
        .expect(201);

      await request(httpServer)
        .patch(`/api/services/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(200);

      const res = await request(httpServer)
        .get('/api/services?page=1&limit=100&active=true')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBe(15);
    });

    it('should return only inactive services when active=false', async () => {
      const createRes = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Inativo Service',
          basePrice: 50,
          estimatedTimeMin: 20,
        })
        .expect(201);

      await request(httpServer)
        .patch(`/api/services/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(200);

      const res = await request(httpServer)
        .get('/api/services?page=1&limit=100&active=false')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBe(1);
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/services').expect(401);
    });

    it('should filter services by name (case-insensitive)', async () => {
      const res = await request(httpServer)
        .get('/api/services?name=servi%C3%A7o+1&limit=100')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination.totalRecords).toBeGreaterThanOrEqual(1);
      res.body.data.forEach((item: { name: string }) => {
        expect(item.name.toLowerCase()).toContain('serviço 1');
      });
    });
  });

  // ─── GET /api/services/:id ────────────────────────────────────────────────

  describe('GET /api/services/:id', () => {
    it('should return service by id', async () => {
      const createRes = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validService)
        .expect(201);

      const serviceId = createRes.body.data.id;

      const res = await request(httpServer)
        .get(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(serviceId);
      expect(res.body.data.name).toBe('Troca de Óleo');
    });

    it('should return 404 for non-existent service', async () => {
      await request(httpServer)
        .get('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(httpServer)
        .get('/api/services/not-a-uuid')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(400);
    });
  });

  // ─── PUT /api/services/:id ────────────────────────────────────────────────

  describe('PUT /api/services/:id', () => {
    let serviceId: string;

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validService)
        .expect(201);
      serviceId = createRes.body.data.id;
    });

    it('should update service data', async () => {
      const res = await request(httpServer)
        .put(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Troca de Óleo Premium',
          description: 'Com óleo sintético',
          basePrice: 189.9,
          estimatedTimeMin: 90,
          isActive: true,
        })
        .expect(200);

      expect(res.body.data.name).toBe('Troca de Óleo Premium');
      expect(res.body.data.description).toBe('Com óleo sintético');
    });

    it('should return 404 for non-existent service', async () => {
      await request(httpServer)
        .put('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Ghost',
          basePrice: 100,
          estimatedTimeMin: 30,
          isActive: true,
        })
        .expect(404);
    });

    it('should return 409 when updating to duplicate name', async () => {
      await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Outro Serviço',
          basePrice: 50,
          estimatedTimeMin: 20,
        })
        .expect(201);

      await request(httpServer)
        .put(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Outro Serviço',
          basePrice: 100,
          estimatedTimeMin: 30,
          isActive: true,
        })
        .expect(409);
    });
  });

  // ─── PATCH /api/services/:id ──────────────────────────────────────────────

  describe('PATCH /api/services/:id', () => {
    let serviceId: string;

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validService)
        .expect(201);
      serviceId = createRes.body.data.id;
    });

    it('should deactivate service', async () => {
      const res = await request(httpServer)
        .patch(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(200);

      expect(res.body.data.isActive).toBe(false);
    });

    it('should reactivate service', async () => {
      await request(httpServer)
        .patch(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(200);

      const res = await request(httpServer)
        .patch(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: true })
        .expect(200);

      expect(res.body.data.isActive).toBe(true);
    });

    it('should return 404 for non-existent service', async () => {
      await request(httpServer)
        .patch('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(404);
    });
  });

  // ─── DELETE /api/services/:id ─────────────────────────────────────────────

  describe('DELETE /api/services/:id', () => {
    it('should delete service and return 204', async () => {
      const createRes = await request(httpServer)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send(validService)
        .expect(201);

      const serviceId = createRes.body.data.id;

      await request(httpServer)
        .delete(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      await request(httpServer)
        .get(`/api/services/${serviceId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent service', async () => {
      await request(httpServer)
        .delete('/api/services/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });
  });
});
