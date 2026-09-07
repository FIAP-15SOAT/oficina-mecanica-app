import { reportTelemetryFailure } from './telemetry-diagnostics';

/**
 * Orçamento de encerramento. A janela do orquestrador é
 * `terminationGracePeriodSeconds` (40 s), da qual 10 s já são a janela de
 * drenagem — sobram 30 s, compartilhados com o fechamento do servidor e o
 * `$disconnect()` do Prisma.
 *
 * Os padrões do SDK **não** cabem aí: o leitor periódico usa 30 s de prazo de
 * exportação e o exportador OTLP 10 s. E um prazo apenas externo — uma corrida
 * contra um relógio no hook — abandona a espera sem **cancelar** a exportação:
 * o handle continua vivo, o processo não encerra e o `SIGKILL` corta o flush e
 * os hooks seguintes junto.
 */
export const DEFAULT_EXPORT_TIMEOUT_MS = 5_000;

export const DEFAULT_METRIC_EXPORT_TIMEOUT_MS = 5_000;

export const DEFAULT_METRIC_EXPORT_INTERVAL_MS = 60_000;

/**
 * Piso medido, não escolhido. Abaixo de 1 s o processo **nunca encerra**: o prazo
 * é encolhido junto com o intervalo (ver `resolveMetricExportTiming`), então uma
 * nova exportação começa antes de o socket da anterior ser liberado e sempre
 * sobra um handle vivo no laço de eventos.
 */
export const MIN_METRIC_EXPORT_INTERVAL_MS = 1_000;

export const TELEMETRY_SHUTDOWN_TIMEOUT_MS = 8_000;

export interface MetricExportTiming {
  intervalMillis: number;
  timeoutMillis: number;
}

export function resolveTimeoutMs(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw?.trim());

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Um prazo de exportação **maior** que o teto do hook de encerramento derrota o
 * teto: o `Promise.race` abandona a espera, mas o handle da exportação continua
 * vivo, o processo não encerra e o `SIGKILL` corta os hooks seguintes junto. Por
 * isso a sobreposição do operador é aceita até o limite em que ela ainda cancela
 * a tempo, e reduzida — com diagnóstico — acima disso.
 */
export function resolveExportTimeoutMs(raw: string | undefined, fallback: number): number {
  const requested = resolveTimeoutMs(raw, fallback);

  if (requested < TELEMETRY_SHUTDOWN_TIMEOUT_MS) {
    return requested;
  }

  reportTelemetryFailure('config', `export-timeout-clamped:${requested}`);

  return DEFAULT_EXPORT_TIMEOUT_MS;
}

/**
 * As duas variáveis do leitor periódico são **relacionadas**, e o construtor
 * lança quando o intervalo é menor que o prazo. Resolvê-las isoladamente deixava
 * uma faixa larga de valores plausíveis — qualquer `OTEL_METRIC_EXPORT_INTERVAL`
 * abaixo do prazo padrão de 5 s, `1000` inclusive — derrubando o processo no
 * preload, antes de qualquer linha de log existir.
 *
 */
export function resolveMetricExportTiming(
  env: NodeJS.ProcessEnv = process.env,
): MetricExportTiming {
  const intervalMillis = resolveMetricIntervalMs(env.OTEL_METRIC_EXPORT_INTERVAL);
  const timeoutMillis = resolveExportTimeoutMs(
    env.OTEL_METRIC_EXPORT_TIMEOUT,
    DEFAULT_METRIC_EXPORT_TIMEOUT_MS,
  );

  if (timeoutMillis <= intervalMillis) {
    return { intervalMillis, timeoutMillis };
  }

  reportTelemetryFailure(
    'config',
    `metric-timeout-above-interval:${timeoutMillis}>${intervalMillis}`,
  );

  return { intervalMillis, timeoutMillis: intervalMillis };
}

function resolveMetricIntervalMs(raw: string | undefined): number {
  const requested = resolveTimeoutMs(raw, DEFAULT_METRIC_EXPORT_INTERVAL_MS);

  if (requested >= MIN_METRIC_EXPORT_INTERVAL_MS) {
    return requested;
  }

  reportTelemetryFailure('config', `metric-interval-clamped:${requested}`);

  return MIN_METRIC_EXPORT_INTERVAL_MS;
}
