import { PrismaService } from '@infrastructure/database/prisma/prisma.service';

export function createMockPrismaClient(): jest.Mocked<PrismaService> {
  return {
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any,
  } as jest.Mocked<PrismaService>;
}
