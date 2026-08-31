import { Inject, Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { ILogger } from '@application/ports/output/logger.service.interface';
import { TECHNICAL_EVENTS } from '@infrastructure/logging/technical-event.catalog';

/**
 * Limita a **aquisição** de conexão, que é o único trecho que a verificação de
 * prontidão não consegue limitar por consulta. Sem ele o default é `0` — esperar
 * para sempre —, e o slot único da prontidão, liberado só quando a operação
 * assenta, deixaria a réplica não-pronta até o TCP desistir.
 */
const CONNECTION_TIMEOUT_MS = 3_000;

const KEEP_ALIVE_INITIAL_DELAY_MS = 10_000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
  /**
   * O pool é construído aqui e exposto de propósito: a verificação de prontidão
   * precisa de um prazo **por consulta** (`query_timeout`), que o Prisma não
   * repassa, e precisa medir **este** pool — o mesmo das rotas de negócio — para
   * que a saturação por-réplica continue sendo detectável. Um pool separado só
   * para a probe mediria outra coisa.
   */
  readonly pool: Pool;

  private readonly logger: ILogger;

  constructor(@Inject('ILogger') logger: ILogger) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
      keepAlive: true,
      keepAliveInitialDelayMillis: KEEP_ALIVE_INITIAL_DELAY_MS,
    });

    // `disposeExternalPool` faz o `dispose()` do adapter chamar `pool.end()`,
    // então o `$disconnect()` continua sendo o único ponto de encerramento.
    super({ adapter: new PrismaPg(pool, { disposeExternalPool: true }) });

    this.pool = pool;
    this.logger = logger.forContext(PrismaService.name);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.event(TECHNICAL_EVENTS.DATABASE_CONNECTION_FAILED, {}, error);

      throw error;
    }

    this.logger.event(TECHNICAL_EVENTS.DATABASE_CONNECTED, {});
  }

  /**
   * `onApplicationShutdown`, e **não** `onModuleDestroy`. O `close()` do Nest
   * executa `callDestroyHook` → `callBeforeShutdownHook` → `dispose` →
   * `callShutdownHook`, ou seja: `onModuleDestroy` roda antes da janela de
   * drain e antes de o servidor HTTP parar de aceitar conexões. Desconectar ali
   * deixaria o pod aceitando tráfego com o pool já encerrado, o que converte
   * "descartar requisição em voo" em "responder erro" — pior do que não ter
   * drain. Aqui o disconnect acontece depois de o servidor fechar, quando não
   * há mais requisição para atender.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();

    this.logger.event(TECHNICAL_EVENTS.DATABASE_DISCONNECTED, {});
  }
}
