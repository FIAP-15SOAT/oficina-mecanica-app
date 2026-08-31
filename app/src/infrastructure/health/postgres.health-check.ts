import { Injectable } from '@nestjs/common';
import type { QueryConfig } from 'pg';

import { HealthFailureCategory } from '@infrastructure/logging/technical-event.catalog';
import { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';

export const POSTGRES_DEPENDENCY_NAME = 'postgresql';

/**
 * O único prazo que **encerra** a operação em vez de abandoná-la: o `pg` rejeita
 * a promessa, o `Pool` remove o client e o `Client.end()` destrói o socket
 * porque há consulta ativa. É isso que libera o slot único de `ReadinessState` e
 * permite a réplica voltar a ficar pronta sem reinício. Aplicado **por
 * consulta**, então nenhuma rota de negócio herda teto de duração.
 */
export const HEALTH_QUERY_TIMEOUT_MS = 2_000;

/**
 * Prazo por chamador, e ele é **maior** que o `connectionTimeoutMillis` do pool
 * (3 s) de propósito: a falha de aquisição só se manifesta ao vencer aquele
 * prazo, e um deadline menor a mascararia como `timeout`, apagando justamente a
 * categoria `pool`. Menor que o `timeoutSeconds` da readinessProbe (5 s) somado
 * à margem de rede, para que o prazo que responde seja o nosso e não o do
 * kubelet — abortar do lado do orquestrador produz `client_aborted` e nenhuma
 * categoria de causa.
 */
export const HEALTH_CHECK_DEADLINE_MS = 3_500;

export type HealthCheckResult =
  | { readonly healthy: true }
  | { readonly healthy: false; readonly category: HealthFailureCategory };

const HEALTHY: HealthCheckResult = { healthy: true };

const TIMED_OUT: HealthCheckResult = { healthy: false, category: 'timeout' };

const MAX_CAUSE_DEPTH = 5;

/**
 * SQLSTATE do PostgreSQL e códigos do `libuv`. A verificação fala com o `pg`
 * diretamente, então o que chega aqui é o erro do driver, sem embrulho.
 */
const CATEGORY_BY_CODE: ReadonlyMap<string, HealthFailureCategory> = new Map<
  string,
  HealthFailureCategory
>([
  ['ECONNREFUSED', 'connection'],
  ['ECONNRESET', 'connection'],
  ['EHOSTUNREACH', 'connection'],
  ['ENETUNREACH', 'connection'],
  ['ENOTFOUND', 'connection'],
  ['EAI_AGAIN', 'connection'],
  ['EPIPE', 'connection'],
  ['ETIMEDOUT', 'timeout'],
  ['08000', 'connection'],
  ['08001', 'connection'],
  ['08003', 'connection'],
  ['08004', 'connection'],
  ['08006', 'connection'],
  ['08P01', 'connection'],
  ['28000', 'authentication'],
  ['28P01', 'authentication'],
  ['3D000', 'connection'],
  ['42501', 'authentication'],
  ['42601', 'query'],
  ['42883', 'query'],
  ['42P01', 'query'],
  ['53300', 'pool'],
  ['53400', 'pool'],
  ['57014', 'timeout'],
  ['57P01', 'connection'],
  ['57P03', 'connection'],
]);

/**
 * As falhas que o `pg` entrega **sem** `code`: `Error`s de mensagem constante,
 * enumerados do fonte instalado. A comparação é por **igualdade exata**, nunca
 * por substring — o antipadrão que faz uma reformulação de mensagem classificar
 * errado em silêncio.
 */
const CATEGORY_BY_MESSAGE: ReadonlyMap<string, HealthFailureCategory> = new Map<
  string,
  HealthFailureCategory
>([
  ['timeout exceeded when trying to connect', 'pool'],
  ['Connection terminated due to connection timeout', 'connection'],
  ['Connection terminated unexpectedly', 'connection'],
  ['Connection terminated', 'connection'],
  ['Client has encountered a connection error and is not queryable', 'connection'],
  ['Client was closed and is not queryable', 'connection'],
  ['Cannot use a pool after calling end on the pool', 'connection'],
  ['Called end on pool more than once', 'connection'],
  ['Query read timeout', 'timeout'],
  ['timeout expired', 'timeout'],
]);

interface ErrorShape {
  code?: unknown;
  message?: unknown;
  cause?: unknown;
  errors?: unknown;
}

/**
 * Percorre `cause` e `errors` além do erro raiz: o `net.connect` do Node agrega
 * as tentativas por família de endereço num `AggregateError`, e `localhost`
 * resolve para duas. Sem visitar os agregados, um `ECONNREFUSED` sairia
 * `unknown`.
 */
export function classifyHealthFailure(error: unknown): HealthFailureCategory {
  const pending: unknown[] = [error];

  for (let visited = 0; visited <= MAX_CAUSE_DEPTH && pending.length > 0; visited += 1) {
    const current = pending.shift();

    if (current === null || typeof current !== 'object') {
      continue;
    }

    const shape = current as ErrorShape;
    const category = matchCode(shape.code) ?? matchMessage(shape.message);

    if (category) {
      return category;
    }

    if (shape.cause !== undefined) {
      pending.push(shape.cause);
    }

    if (Array.isArray(shape.errors)) {
      pending.push(...(shape.errors as unknown[]).slice(0, MAX_CAUSE_DEPTH));
    }
  }

  return 'unknown';
}

function matchCode(code: unknown): HealthFailureCategory | undefined {
  return typeof code === 'string' ? CATEGORY_BY_CODE.get(code) : undefined;
}

function matchMessage(message: unknown): HealthFailureCategory | undefined {
  return typeof message === 'string' ? CATEGORY_BY_MESSAGE.get(message) : undefined;
}

/**
 * Abandona a espera do chamador; quem **encerra** a operação é o
 * `query_timeout` acima. Por isso a promessa recebida aqui continua viva depois
 * do `race`, e o slot de `ReadinessState` continua a segurá-la até ela assentar.
 */
export function withDeadline(
  pending: Promise<HealthCheckResult>,
  deadlineMs: number = HEALTH_CHECK_DEADLINE_MS,
): Promise<HealthCheckResult> {
  let timer: NodeJS.Timeout | undefined;

  const deadline = new Promise<HealthCheckResult>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), deadlineMs);
    timer.unref?.();
  });

  return Promise.race([pending, deadline]).finally(() => clearTimeout(timer));
}

@Injectable()
export class PostgresHealthCheck {
  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<HealthCheckResult> {
    const verification: QueryConfig & { query_timeout: number } = {
      text: 'SELECT 1',
      query_timeout: HEALTH_QUERY_TIMEOUT_MS,
    };

    try {
      await this.prisma.pool.query(verification);
    } catch (error) {
      return { healthy: false, category: classifyHealthFailure(error) };
    }

    return HEALTHY;
  }
}
