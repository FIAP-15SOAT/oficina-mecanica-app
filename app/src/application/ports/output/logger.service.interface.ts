import { LogEventDefinition } from '@application/logging/log-event';
import { LogFields } from '@application/logging/log-field';

/**
 * Rejeita, em tempo de compilação, um campo que a entrada do catálogo não
 * declara.
 */
export type NoExtraFields<TAllowed, TGiven> = TGiven &
  Record<Exclude<keyof TGiven, keyof TAllowed>, never>;

export interface ILogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
  event<TFields extends LogFields, TGiven extends TFields>(
    definition: LogEventDefinition<TFields>,
    fields: NoExtraFields<TFields, TGiven>,
    error?: unknown,
  ): void;
  forContext(scope: string): ILogger;
}
