import { DiagLogger } from '@opentelemetry/api';

import { writeDiagnostic } from '@infrastructure/logging/logging-diagnostics';
import { sanitizeText } from '@infrastructure/logging/redaction/text-sanitizer';

export const TELEMETRY_FAILURE_MESSAGE = 'telemetry failure';

export const MAX_TELEMETRY_DETAIL_LENGTH = 256;

export const TELEMETRY_REPORT_WINDOW_MS = 60_000;

export const MAX_TRACKED_CAUSES = 64;

export type TelemetryFailureStage =
  | 'config'
  | 'startup'
  | 'diagnostic'
  | 'shutdown'
  | 'metric-emission';

export type TelemetrySeverity = 'warn' | 'error';

interface CauseState {
  reportedAt: number;
  suppressed: number;
}

const causes = new Map<string, CauseState>();

/**
 * Costura de teste: a janela de repetição é estado de módulo, então dois casos
 * que provoquem a **mesma** causa veriam o segundo suprimido. `captureDiagnostics`
 * chama isto ao começar a observar o canal.
 */
export function resetTelemetryDiagnostics(): void {
  causes.clear();
}

/**
 * O `diag` do OTel escreve no console por padrão, e uma falha de exportação
 * imprimiria texto livre em **stdout** — que aqui é contrato fechado: um objeto
 * JSON por linha, todas as chaves declaradas.
 */
export function reportTelemetryFailure(
  stage: TelemetryFailureStage,
  detail?: unknown,
  severity: TelemetrySeverity = 'error',
): void {
  const described = detail === undefined ? undefined : describeDetail(detail);
  const suppressed = registerCause(`${severity}:${stage}:${described ?? ''}`);

  if (suppressed === undefined) {
    return;
  }

  writeDiagnostic(
    TELEMETRY_FAILURE_MESSAGE,
    {
      'oficina.telemetry.failure.stage': stage,
      ...(described === undefined ? {} : { 'oficina.telemetry.failure.detail': described }),
      ...(suppressed > 0 ? { 'oficina.telemetry.failure.suppressed': String(suppressed) } : {}),
    },
    severity,
  );
}

/**
 * Devolve quantas ocorrências foram suprimidas desde a última linha desta causa,
 * ou `undefined` quando esta ocorrência deve ser suprimida. A primeira sempre
 * sai — o que a janela limita é a repetição, nunca o primeiro sinal de uma causa
 * nova.
 */
function registerCause(fingerprint: string): number | undefined {
  const now = Date.now();
  const state = causes.get(fingerprint);

  if (state && now - state.reportedAt < TELEMETRY_REPORT_WINDOW_MS) {
    state.suppressed += 1;

    return undefined;
  }

  if (!state && causes.size >= MAX_TRACKED_CAUSES) {
    causes.clear();
  }

  causes.set(fingerprint, { reportedAt: now, suppressed: 0 });

  return state?.suppressed ?? 0;
}

/**
 * Precisa ser instalado **antes** de `new NodeSDK(...)`: o construtor instala um
 * `DiagConsoleLogger` por conta própria quando `OTEL_LOG_LEVEL` está definida, e
 * ele já **emite** durante a construção — medido, uma linha crua
 * (`@opentelemetry/api: Registered a global for diag`) em stdout, antes de
 * qualquer chance de sobrescrever o canal.
 */
export function createTelemetryDiagLogger(): DiagLogger {
  const report =
    (severity: TelemetrySeverity) =>
    (message: string, ...args: unknown[]): void => {
      reportTelemetryFailure(
        'diagnostic',
        [message, ...args.map(describeDetail)].join(' '),
        severity,
      );
    };

  return {
    error: report('error'),
    warn: report('warn'),
    info: () => undefined,
    debug: () => undefined,
    verbose: () => undefined,
  };
}

function describeDetail(detail: unknown): string {
  if (detail instanceof Error) {
    return sanitizeText(`${detail.name}: ${detail.message}`, MAX_TELEMETRY_DETAIL_LENGTH);
  }

  if (typeof detail === 'string') {
    return sanitizeText(detail, MAX_TELEMETRY_DETAIL_LENGTH);
  }

  return typeof detail;
}
