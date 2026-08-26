import { defineLogEvent } from '@application/logging/log-event';

export type MailOutcome = 'sent' | 'failed';

export type MailErrorCategory = 'transport' | 'unknown';

type EmptyFields = Record<never, never>;

export const TECHNICAL_EVENTS = {
  APPLICATION_STARTED: defineLogEvent<{ port: number }>({
    name: 'app.started',
    message: 'http server accepting connections',
    level: 'info',
  }),
  // O hook `onApplicationShutdown` do Nest roda **depois** de `onModuleDestroy`,
  // de `beforeApplicationShutdown` e do `dispose()` do servidor — então o
  // `db.disconnected` sai antes desta linha. A mensagem descreve o encerramento
  // como concluído porque é o que já aconteceu quando ela é emitida, e continua
  // verdadeira quando `app.close()` é chamado sem nenhum sinal.
  APPLICATION_SHUTDOWN: defineLogEvent<{ signal?: string }>({
    name: 'app.shutdown',
    message: 'application shutdown completed',
    level: 'info',
  }),
  APPLICATION_BOOTSTRAP_FAILED: defineLogEvent<EmptyFields>({
    name: 'app.bootstrap.failed',
    message: 'application failed to start',
    level: 'error',
  }),
  DATABASE_CONNECTED: defineLogEvent<EmptyFields>({
    name: 'db.connected',
    message: 'database connection pool opened',
    level: 'info',
  }),
  DATABASE_CONNECTION_FAILED: defineLogEvent<EmptyFields>({
    name: 'db.connection.failed',
    message: 'database connection could not be opened',
    level: 'error',
  }),
  DATABASE_DISCONNECTED: defineLogEvent<EmptyFields>({
    name: 'db.disconnected',
    message: 'database connection pool closed',
    level: 'info',
  }),
  EMAIL_SENT: defineLogEvent<{
    mailOperation: string;
    mailDestinationSystem: string;
    mailOutcome: MailOutcome;
    mailRecipient: string;
    mailDurationMs: number;
  }>({
    name: 'mail.send.succeeded',
    message: 'email accepted by the smtp server',
    level: 'info',
  }),
  EMAIL_SEND_FAILED: defineLogEvent<{
    mailOperation: string;
    mailDestinationSystem: string;
    mailOutcome: MailOutcome;
    mailRecipient: string;
    mailDurationMs: number;
    mailErrorCategory: MailErrorCategory;
  }>({
    name: 'mail.send.failed',
    message: 'email rejected by the smtp server',
    level: 'error',
  }),
  HTTP_REQUEST_FAILED: defineLogEvent<EmptyFields>({
    name: 'http.request.failed',
    message: 'http request failed with a server error',
    level: 'error',
  }),
} as const;
