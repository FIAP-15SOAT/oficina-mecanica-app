import { BeforeApplicationShutdown, Inject, Injectable } from '@nestjs/common';

import { ILogger } from '@application/ports/output/logger.service.interface';
import { TECHNICAL_EVENTS } from '@infrastructure/logging/technical-event.catalog';

import {
  HealthCheckResult,
  POSTGRES_DEPENDENCY_NAME,
  PostgresHealthCheck,
  withDeadline,
} from './postgres.health-check';

export const DRAIN_WINDOW_MS = 10_000;

const TERMINATION_SIGNALS: ReadonlySet<string> = new Set(['SIGTERM', 'SIGINT']);

const ORCHESTRATED_ENVIRONMENT = 'production';

/**
 * A janela só é sustentada onde existe um plano de dados para propagar a
 * remoção. Fora dele ela é puro custo: `nest start --watch` mata o processo com
 * `SIGTERM` e só respawna no `exit`, então cada hot reload em Linux/macOS
 * pagaria os 10 s (no Windows não, porque o `tree-kill` usa `taskkill /F` — o
 * que torna a regressão invisível para quem desenvolve lá).
 */
export function isDrainWindowEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === ORCHESTRATED_ENVIRONMENT;
}

@Injectable()
export class ReadinessState implements BeforeApplicationShutdown {
  private readonly logger: ILogger;

  private pending?: Promise<HealthCheckResult>;

  private draining = false;

  private degradedSince?: number;

  constructor(
    private readonly check: PostgresHealthCheck,
    @Inject('ILogger') logger: ILogger,
  ) {
    this.logger = logger.forContext(ReadinessState.name);
  }

  async isReady(): Promise<boolean> {
    if (this.draining) {
      return false;
    }

    const result = await withDeadline(this.runExclusively());

    // Consultado de novo, e **antes** de aplicar o resultado: o sinal de término
    // pode ter chegado enquanto a verificação corria, e uma verificação iniciada
    // antes dele não pode repor `ready` nem emitir recuperação.
    if (this.draining) {
      return false;
    }

    this.recordTransition(result);

    return result.healthy;
  }

  async beforeApplicationShutdown(signal?: string): Promise<void> {
    this.draining = true;

    if (signal === undefined || !TERMINATION_SIGNALS.has(signal) || !isDrainWindowEnabled()) {
      return;
    }

    await delay(DRAIN_WINDOW_MS);
  }

  /**
   * O slot detém a promessa **bruta** e só é liberado quando ela assenta —
   * nunca quando o prazo de um chamador expira. Liberar no prazo faria cada
   * verificação seguinte disparar uma consulta nova sobre as anteriores ainda
   * pendentes, e a verificação de saúde viraria causa de indisponibilidade.
   */
  private runExclusively(): Promise<HealthCheckResult> {
    if (this.pending) {
      return this.pending;
    }

    const pending = this.check.run();

    this.pending = pending;

    // O `catch` existe porque `finally` devolve uma promessa **nova**, que
    // rejeita junto com a original: sem ele, uma verificação que rejeitasse
    // produziria rejeição não tratada além do erro que o chamador já recebe.
    //
    // A limpeza é incondicional de propósito. `runExclusively` é o único
    // escritor do slot e só o preenche quando ele está vazio, então a promessa
    // que assenta aqui é necessariamente a que está guardada: uma checagem de
    // identidade nunca seria falsa e absorveria em silêncio um segundo escritor
    // futuro, em vez de deixá-lo falhar alto.
    void pending
      .finally(() => {
        this.pending = undefined;
      })
      .catch(() => undefined);

    return pending;
  }

  private recordTransition(result: HealthCheckResult): void {
    if (!result.healthy) {
      if (this.degradedSince !== undefined) {
        return;
      }

      this.degradedSince = Date.now();

      this.logger.event(TECHNICAL_EVENTS.HEALTH_DEGRADED, {
        dependencyName: POSTGRES_DEPENDENCY_NAME,
        healthFailureCategory: result.category,
      });

      return;
    }

    if (this.degradedSince === undefined) {
      return;
    }

    const healthDegradedDurationMs = Date.now() - this.degradedSince;

    this.degradedSince = undefined;

    this.logger.event(TECHNICAL_EVENTS.HEALTH_RECOVERED, {
      dependencyName: POSTGRES_DEPENDENCY_NAME,
      healthDegradedDurationMs,
    });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
