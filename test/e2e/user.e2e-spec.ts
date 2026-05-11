import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { AuthTokens, registerAndLogin } from '../helpers/auth.helper';

describe('User (E2E)', () => {
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
        email: 'admin@e2e.test',
        role: 'ADMIN',
      },
      ctx.prisma,
    );
  });

  // ─── POST /api/users ─────────────────────────────────────────────────────

  describe('POST /api/users', () => {
    it('should create a user and return 201', async () => {
      const res = await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Novo Usuário',
          email: 'novo@e2e.test',
          password: 'Senha@123',
          role: 'MECHANIC',
        })
        .expect(201);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Novo Usuário',
          email: 'novo@e2e.test',
          role: 'MECHANIC',
          isActive: true,
        }),
      );
    });

    it('should return 409 when creating user with duplicate email', async () => {
      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'User A',
          email: 'dup@e2e.test',
          password: 'Senha@123',
          role: 'MECHANIC',
        })
        .expect(201);

      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'User B',
          email: 'dup@e2e.test',
          password: 'Senha@123',
          role: 'MECHANIC',
        })
        .expect(409);
    });

    it('should return 400 with invalid body', async () => {
      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'ab', email: 'bad', password: '12' })
        .expect(400);
    });

    it('should return 400 when password does not meet the strength policy', async () => {
      const res = await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Senha Fraca',
          email: 'fraca@e2e.test',
          password: '12345678',
          role: 'MECHANIC',
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('caractere especial')]),
      );
    });

    it('should return 400 when name is shorter than the minimum length', async () => {
      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'ab', email: 'shortname@e2e.test', password: 'Senha@123', role: 'MECHANIC' })
        .expect(400);
    });

    it('should return 400 when name exceeds the maximum length', async () => {
      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'a'.repeat(151),
          email: 'longname@e2e.test',
          password: 'Senha@123',
          role: 'MECHANIC',
        })
        .expect(400);
    });

    it('should return 400 when email is invalid', async () => {
      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Valid Name', email: 'notanemail', password: 'Senha@123', role: 'MECHANIC' })
        .expect(400);
    });

    it('should return 400 when password is shorter than the minimum length', async () => {
      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Valid Name', email: 'valid@e2e.test', password: 'ab', role: 'MECHANIC' })
        .expect(400);
    });

    it('should return 400 when role is invalid', async () => {
      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Valid Name',
          email: 'valid@e2e.test',
          password: 'Senha@123',
          role: 'INVALID',
        })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(httpServer)
        .post('/api/users')
        .send({
          name: 'No Auth',
          email: 'noauth@e2e.test',
          password: 'Senha@123',
        })
        .expect(401);
    });

    it('should return 403 for non-admin role', async () => {
      const mechanic = await registerAndLogin(
        httpServer,
        {
          name: 'Mechanic',
          email: 'mechanic@e2e.test',
          role: 'MECHANIC',
        },
        ctx.prisma,
      );

      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${mechanic.accessToken}`)
        .send({
          name: 'Forbidden',
          email: 'forbidden@e2e.test',
          password: 'Senha@123',
        })
        .expect(403);
    });
  });

  // ─── GET /api/users ───────────────────────────────────────────────────────

  describe('GET /api/users', () => {
    it('should return list of users', async () => {
      const res = await request(httpServer)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should use default pagination (page=1, limit=10) when not provided', async () => {
      const res = await request(httpServer)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });

    it('should filter users by role', async () => {
      // Create a mechanic
      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Mechanic Test',
          email: 'mech@test.com',
          password: 'Senha@123',
          role: 'MECHANIC',
        })
        .expect(201);

      const res = await request(httpServer)
        .get('/api/users?role=MECHANIC')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      res.body.data.forEach((user: { role: string }) => {
        expect(user.role).toBe('MECHANIC');
      });
    });

    it('should filter users by name', async () => {
      // Create a user with a specific name
      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'UniqueName Search',
          email: 'unique@test.com',
          password: 'Senha@123',
          role: 'MECHANIC',
        })
        .expect(201);

      const res = await request(httpServer)
        .get('/api/users?name=UniqueName')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('UniqueName Search');
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/users').expect(401);
    });

    it('should return 403 for non-admin role', async () => {
      const attendant = await registerAndLogin(
        httpServer,
        {
          name: 'Attendant',
          email: 'attendant@e2e.test',
          role: 'ATTENDANT',
        },
        ctx.prisma,
      );

      await request(httpServer)
        .get('/api/users')
        .set('Authorization', `Bearer ${attendant.accessToken}`)
        .expect(403);
    });
  });

  // ─── GET /api/users/:id ───────────────────────────────────────────────────

  describe('GET /api/users/:id', () => {
    it('should return user by id', async () => {
      const createRes = await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Find Me',
          email: 'findme@e2e.test',
          password: 'Senha@123',
          role: 'MECHANIC',
        })
        .expect(201);

      const userId = createRes.body.data.id;

      const res = await request(httpServer)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.name).toBe('Find Me');
    });

    it('should return 404 for non-existent user', async () => {
      await request(httpServer)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(httpServer)
        .get('/api/users/not-a-uuid')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(400);
    });
  });

  // ─── PUT /api/users/:id ───────────────────────────────────────────────────

  describe('PUT /api/users/:id', () => {
    let userId: string;

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Update Me',
          email: 'updateme@e2e.test',
          password: 'Senha@123',
          role: 'ATTENDANT',
        })
        .expect(201);
      userId = createRes.body.data.id;
    });

    it('should update user data', async () => {
      const res = await request(httpServer)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Updated Name', role: 'MECHANIC' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.role).toBe('MECHANIC');
    });

    it('should return 404 for non-existent user', async () => {
      await request(httpServer)
        .put('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'Ghost' })
        .expect(404);
    });

    it('should return 400 when updating with a name shorter than the minimum length', async () => {
      await request(httpServer)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'ab' })
        .expect(400);
    });

    it('should return 400 when updating with a name that exceeds the maximum length', async () => {
      await request(httpServer)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ name: 'a'.repeat(151) })
        .expect(400);
    });

    it('should return 409 when updating to duplicate email', async () => {
      await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Other',
          email: 'other@e2e.test',
          password: 'Senha@123',
          role: 'MECHANIC',
        })
        .expect(201);

      await request(httpServer)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ email: 'other@e2e.test' })
        .expect(409);
    });

    it('should update user email', async () => {
      const res = await request(httpServer)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ email: 'newemail@e2e.test' })
        .expect(200);

      expect(res.body.data.email).toBe('newemail@e2e.test');
    });

    it('should update user password and allow login with new password', async () => {
      await request(httpServer)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ password: 'NewPassword@123' })
        .expect(200);

      await request(httpServer)
        .post('/api/auth/login')
        .send({ email: 'updateme@e2e.test', password: 'NewPassword@123' })
        .expect(200);
    });

    it('should return 400 when updating to a password that does not meet the strength policy', async () => {
      const res = await request(httpServer)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ password: 'fraquinha' })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('caractere especial')]),
      );
    });
  });

  // ─── PATCH /api/users/:id ─────────────────────────────────────────────────

  describe('PATCH /api/users/:id', () => {
    let userId: string;

    beforeEach(async () => {
      const createRes = await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Status User',
          email: 'status@e2e.test',
          password: 'Senha@123',
          role: 'MECHANIC',
        })
        .expect(201);
      userId = createRes.body.data.id;
    });

    it('should deactivate user', async () => {
      const res = await request(httpServer)
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(200);

      expect(res.body.data.isActive).toBe(false);
    });

    it('should reactivate user', async () => {
      await request(httpServer)
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(200);

      const res = await request(httpServer)
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: true })
        .expect(200);

      expect(res.body.data.isActive).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      await request(httpServer)
        .patch('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(404);
    });

    it('should return 422 when deactivating an already-inactive user', async () => {
      await request(httpServer)
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(200);

      await request(httpServer)
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: false })
        .expect(422);
    });

    it('should return 422 when activating an already-active user', async () => {
      await request(httpServer)
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: true })
        .expect(422);
    });

    it('should return 400 when active is not a boolean', async () => {
      await request(httpServer)
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ active: 'yes' })
        .expect(400);
    });
  });

  // ─── DELETE /api/users/:id ────────────────────────────────────────────────

  describe('DELETE /api/users/:id', () => {
    it('should delete user and return 204', async () => {
      const createRes = await request(httpServer)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          name: 'Delete Me',
          email: 'deleteme@e2e.test',
          password: 'Senha@123',
          role: 'MECHANIC',
        })
        .expect(201);

      const userId = createRes.body.data.id;

      await request(httpServer)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      await request(httpServer)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent user', async () => {
      await request(httpServer)
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });
  });
});
