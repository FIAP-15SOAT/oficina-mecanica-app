import { randomUUID } from 'node:crypto';
import { PrismaPasswordResetCodeRepository } from '@infrastructure/persistence/prisma/repositories/prisma-password-reset-code.repository';
import { PasswordResetCode } from '@domain/entities/password-reset-code.entity';
import {
  createMockPrismaClient,
  MockPrismaService,
} from '../../../../../helpers/prisma-mock.factory';

describe('PrismaPasswordResetCodeRepository', () => {
  let repository: PrismaPasswordResetCodeRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaPasswordResetCodeRepository(prisma);
  });

  describe('upsert', () => {
    it('should upsert keyed by userId', async () => {
      const userId = randomUUID();
      const code = PasswordResetCode.create(userId, 'hashed');

      prisma.passwordResetCode.upsert.mockResolvedValue({
        userId,
        codeHash: code.codeHash,
        attempts: 0,
        expiresAt: code.expiresAt,
        createdAt: code.createdAt,
      });

      const result = await repository.upsert(code);

      expect(result.userId).toBe(userId);
      expect(prisma.passwordResetCode.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: {
          userId,
          codeHash: code.codeHash,
          attempts: 0,
          expiresAt: code.expiresAt,
        },
        update: {
          codeHash: code.codeHash,
          attempts: 0,
          expiresAt: code.expiresAt,
        },
      });
    });
  });

  describe('findByUserId', () => {
    it('should return the code when found', async () => {
      const userId = randomUUID();
      prisma.passwordResetCode.findUnique.mockResolvedValue({
        userId,
        codeHash: 'hashed',
        attempts: 0,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await repository.findByUserId(userId);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
    });

    it('should return null when not found', async () => {
      prisma.passwordResetCode.findUnique.mockResolvedValue(null);

      const result = await repository.findByUserId(randomUUID());

      expect(result).toBeNull();
    });
  });

  describe('incrementAttempts', () => {
    it('should atomically increment attempts by userId', async () => {
      const userId = randomUUID();

      prisma.passwordResetCode.update.mockResolvedValue({
        userId,
        codeHash: 'hashed',
        attempts: 1,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      await repository.incrementAttempts(userId);

      expect(prisma.passwordResetCode.update).toHaveBeenCalledWith({
        where: { userId },
        data: { attempts: { increment: 1 } },
      });
    });
  });

  describe('delete', () => {
    it('should delete by userId', async () => {
      const userId = randomUUID();

      await repository.delete(userId);

      expect(prisma.passwordResetCode.delete).toHaveBeenCalledWith({ where: { userId } });
    });
  });
});
