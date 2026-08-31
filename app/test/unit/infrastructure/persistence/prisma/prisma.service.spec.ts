jest.mock('@generated/client', () => ({
  PrismaClient: class {
    $connect = jest.fn().mockResolvedValue(undefined);
    $disconnect = jest.fn().mockResolvedValue(undefined);
  },
}));

jest.mock('@prisma/adapter-pg', () => ({ PrismaPg: jest.fn() }));

jest.mock('pg', () => ({ Pool: jest.fn().mockImplementation(() => ({ query: jest.fn() })) }));

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { TECHNICAL_EVENTS } from '@infrastructure/logging/technical-event.catalog';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';

import { createMockLogger } from '../../../../helpers/logger-mock.factory';

type MockedPrismaService = PrismaService & { $connect: jest.Mock; $disconnect: jest.Mock };

const adapter = jest.mocked(PrismaPg);
const pool = jest.mocked(Pool);

function createService(logger = createMockLogger()): MockedPrismaService {
  return new PrismaService(logger) as MockedPrismaService;
}

describe('PrismaService', () => {
  beforeEach(() => {
    adapter.mockClear();
    pool.mockClear();
  });

  it('should not disconnect on the module destroy hook', () => {
    const service = createService();

    expect((service as Partial<{ onModuleDestroy: unknown }>).onModuleDestroy).toBeUndefined();
  });

  it('should disconnect on the application shutdown hook', async () => {
    const service = createService();

    await service.onApplicationShutdown();

    expect(service.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('should emit the disconnected event after releasing the pool', async () => {
    const logger = createMockLogger();

    await createService(logger).onApplicationShutdown();

    expect(logger.event).toHaveBeenCalledWith(TECHNICAL_EVENTS.DATABASE_DISCONNECTED, {});
  });

  it('should harden the connection pool instead of passing only the connection string', () => {
    createService();

    expect(pool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeoutMillis: 3_000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10_000,
      }),
    );
  });

  /**
   * A prontidão precisa de um prazo **por consulta**, que o Prisma não repassa,
   * e precisa medir o mesmo pool das rotas de negócio — um pool próprio para a
   * probe mediria outra coisa.
   */
  it('should expose the very pool it handed to the adapter', () => {
    const service = createService();

    expect(service.pool).toBe(pool.mock.results[0].value);
    expect(adapter).toHaveBeenCalledWith(service.pool, expect.anything());
  });

  /**
   * Sem `disposeExternalPool` o `$disconnect()` deixaria o pool aberto e o
   * encerramento passaria a exigir um segundo ponto de liberação.
   */
  it('should delegate the pool shutdown to the adapter', () => {
    createService();

    expect(adapter).toHaveBeenCalledWith(expect.anything(), { disposeExternalPool: true });
  });

  it('should emit the connected event when the pool is initialized', async () => {
    const logger = createMockLogger();

    await createService(logger).onModuleInit();

    expect(logger.event).toHaveBeenCalledWith(TECHNICAL_EVENTS.DATABASE_CONNECTED, {});
  });

  it('should report and rethrow when the pool cannot be initialized', async () => {
    const logger = createMockLogger();
    const service = createService(logger);
    const failure = new Error('boom');

    service.$connect.mockRejectedValue(failure);

    await expect(service.onModuleInit()).rejects.toThrow(failure);

    expect(logger.event).toHaveBeenCalledWith(
      TECHNICAL_EVENTS.DATABASE_CONNECTION_FAILED,
      {},
      failure,
    );
  });
});
