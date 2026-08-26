import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { configureApp, resolvePort } from './config/app-bootstrap';

import { TECHNICAL_EVENTS } from './infrastructure/logging/technical-event.catalog';
import { PinoLoggerAdapter } from './infrastructure/logging/pino-logger.adapter';
import { reportBootstrapFailure } from './infrastructure/logging/bootstrap-failure';

const FATAL_EXIT_GRACE_MS = 5_000;

async function bootstrap(): Promise<void> {
  const port = resolvePort(process.env.PORT);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  try {
    app.useLogger(app.get(Logger));

    const startupWarnings = configureApp(app, { withSwagger: true });

    app.enableShutdownHooks();

    await app.listen(port);

    logStartup(app, port, startupWarnings);
  } catch (error) {
    // O `close()` do Nest executa os hooks de shutdown em série e um
    // deles espera o `$disconnect()` do Prisma sem prazo: se ele não
    // resolvesse, `bootstrap()` também nunca rejeitaria, e a linha fatal,
    // o código de saída e o próprio watchdog jamais seriam armados.
    reportFatal(error);

    void app.close().catch(() => undefined);
  }
}

function logStartup(app: NestExpressApplication, port: number, warnings: string[]): void {
  const logger = app.get(PinoLoggerAdapter).forContext('Bootstrap');

  for (const warning of warnings) {
    logger.warn(warning);
  }

  logger.event(TECHNICAL_EVENTS.APPLICATION_STARTED, { port });
}

/**
 * `process.exitCode` em vez de `process.exit()`: o código de saída marca a
 * falha para o orquestrador reiniciar, e o processo ainda encerra sozinho
 * quando o loop de eventos esvazia — sem cortar a escrita da linha acima, que
 * em contêiner cai num pipe e nem sempre é síncrona.
 *
 * O timer é a rede de segurança para quando o loop **não** esvazia: um handle
 * que sobrou, ou um hook de shutdown que não resolve. Está `unref`ado de
 * propósito, então não segura o processo no caminho saudável e só chega a
 * disparar se algo de fato o prendeu.
 */
function reportFatal(error: unknown): void {
  reportBootstrapFailure(error);

  process.exitCode = 1;

  setTimeout(() => process.exit(1), FATAL_EXIT_GRACE_MS).unref();
}

void bootstrap().catch(reportFatal);
