import { Injectable, OnApplicationShutdown } from '@nestjs/common';

import { reportTelemetryFailure } from './telemetry-diagnostics';
import { getTelemetrySdk } from './telemetry-sdk.registry';
import { TELEMETRY_SHUTDOWN_TIMEOUT_MS } from './telemetry.constants';

/**
 * `onApplicationShutdown`, e não `onModuleDestroy`, pela mesma razão do Prisma:
 * o Nest executa `callDestroyHook -> callBeforeShutdownHook -> dispose ->
 * callShutdownHook`, e descarregar antes da janela de drenagem exportaria os
 * spans de requisições que ainda estão sendo atendidas.
 */
@Injectable()
export class TelemetryLifecycleService implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    const sdk = getTelemetrySdk();

    if (!sdk) {
      return;
    }

    try {
      await withShutdownDeadline(sdk.shutdown());
    } catch (error) {
      // Falha no descarregamento nunca impede o processo de encerrar nem os
      // hooks seguintes de rodar.
      reportTelemetryFailure('shutdown', error);
    }
  }
}

function withShutdownDeadline(pending: Promise<void>): Promise<void> {
  let timer: NodeJS.Timeout | undefined;

  const deadline = new Promise<void>((resolve) => {
    // `unref` para que o temporizador não segure o processo no caminho saudável.
    timer = setTimeout(resolve, TELEMETRY_SHUTDOWN_TIMEOUT_MS);
    timer.unref();
  });

  return Promise.race([pending, deadline]).finally(() => clearTimeout(timer));
}
