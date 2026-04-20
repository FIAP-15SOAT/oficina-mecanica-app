import { PrismaService } from '@infrastructure/database/prisma/prisma.service';

type MockDelegate = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

export type MockPrismaService = {
  service: MockDelegate;
  user: MockDelegate;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $transaction: jest.Mock;
} & PrismaService;

export function createMockPrismaClient(): MockPrismaService {
  return {
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest
      .fn()
      .mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries)),
  } as unknown as MockPrismaService;
}
