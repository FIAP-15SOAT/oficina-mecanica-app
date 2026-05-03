import { randomUUID } from 'node:crypto';
import { User as PrismaUserModel } from '@generated/client';
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';

import { createMockUser } from '../../../helpers/user-mock.factory';

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaUserRepository(prisma);
  });

  describe('create', () => {
    it('should create a user and return domain entity', async () => {
      const user = User.create({
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        passwordHash: '$2b$10$hashedpassword',
        role: UserRole.MECHANIC,
      });

      const prismaModel = createMockUser({
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
      });

      prisma.user.create.mockResolvedValue(prismaModel);

      const result = await repository.create(user);

      expect(result).toEqual(
        new User({
          id: prismaModel.id,
          name: prismaModel.name,
          email: prismaModel.email,
          passwordHash: prismaModel.passwordHash,
          role: prismaModel.role as UserRole,
          isActive: prismaModel.isActive,
          createdAt: prismaModel.createdAt,
          updatedAt: prismaModel.updatedAt,
        }),
      );

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          isActive: user.isActive,
        },
      });
    });
  });

  describe('findById', () => {
    it('should find a user by id and return domain entity', async () => {
      const id = randomUUID();
      const prismaModel = createMockUser({ id });

      prisma.user.findUnique.mockResolvedValue(prismaModel);

      const result = await repository.findById(id);

      expect(result).toEqual(
        new User({
          id: prismaModel.id,
          name: prismaModel.name,
          email: prismaModel.email,
          passwordHash: prismaModel.passwordHash,
          role: prismaModel.role as UserRole,
          isActive: prismaModel.isActive,
          createdAt: prismaModel.createdAt,
          updatedAt: prismaModel.updatedAt,
        }),
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id } });
    });

    it('should return null when user is not found', async () => {
      const id = randomUUID();

      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById(id);

      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id } });
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email and return domain entity', async () => {
      const email = 'john.doe@example.com';
      const prismaModel = createMockUser({ email });

      prisma.user.findUnique.mockResolvedValue(prismaModel);

      const result = await repository.findByEmail(email);

      expect(result).toEqual(
        new User({
          id: prismaModel.id,
          name: prismaModel.name,
          email: prismaModel.email,
          passwordHash: prismaModel.passwordHash,
          role: prismaModel.role as UserRole,
          isActive: prismaModel.isActive,
          createdAt: prismaModel.createdAt,
          updatedAt: prismaModel.updatedAt,
        }),
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email } });
    });

    it('should return null when user is not found', async () => {
      const email = 'nonexistent@example.com';

      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail(email);

      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email } });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const prismaModels = [
        createMockUser({ id: randomUUID(), name: 'User 1' }),
        createMockUser({ id: randomUUID(), name: 'User 2' }),
      ];

      prisma.user.findMany.mockResolvedValue(prismaModels);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        new User({
          id: prismaModels[0].id,
          name: prismaModels[0].name,
          email: prismaModels[0].email,
          passwordHash: prismaModels[0].passwordHash,
          role: prismaModels[0].role as UserRole,
          isActive: prismaModels[0].isActive,
          createdAt: prismaModels[0].createdAt,
          updatedAt: prismaModels[0].updatedAt,
        }),
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('should update a user with all fields', async () => {
      const id = randomUUID();
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        passwordHash: '$2b$10$newhash',
        role: UserRole.ADMIN,
        isActive: false,
      };

      const updatedPrismaModel = createMockUser({
        id,
        name: updateData.name,
        email: updateData.email,
        passwordHash: updateData.passwordHash,
        role: updateData.role,
        isActive: updateData.isActive,
      });

      prisma.user.update.mockResolvedValue(updatedPrismaModel);

      const result = await repository.update(id, updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.role).toBe(updateData.role);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id },
        data: updateData,
      });
    });

    it('should update user status', async () => {
      const id = randomUUID();
      const updateData = {
        isActive: false,
      };

      const updatedPrismaModel = createMockUser({
        id,
        isActive: false,
      });

      prisma.user.update.mockResolvedValue(updatedPrismaModel);

      const result = await repository.update(id, updateData);

      expect(result.isActive).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          isActive: false,
        },
      });
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const id = randomUUID();

      prisma.user.delete.mockResolvedValue(createMockUser({ id }));

      await repository.delete(id);

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id } });
    });
  });
});
