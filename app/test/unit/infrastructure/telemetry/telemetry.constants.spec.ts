import { DRAIN_WINDOW_MS } from '@infrastructure/health/readiness-state';
import {
  DEFAULT_EXPORT_TIMEOUT_MS,
  DEFAULT_METRIC_EXPORT_INTERVAL_MS,
  DEFAULT_METRIC_EXPORT_TIMEOUT_MS,
  MIN_METRIC_EXPORT_INTERVAL_MS,
  resolveExportTimeoutMs,
  resolveMetricExportTiming,
  resolveTimeoutMs,
  TELEMETRY_SHUTDOWN_TIMEOUT_MS,
} from '@infrastructure/telemetry/telemetry.constants';
import { captureDiagnostics, DiagnosticsCapture } from '../../../helpers/diagnostics-capture';

/**
 * `terminationGracePeriodSeconds` do Deployment. Não é lido do manifesto de
 * propósito — o que este spec protege é a **relação** entre os prazos do
 * código; o número do orquestrador entra como referência declarada, e um ajuste
 * lá que quebre a aritmética aparece aqui como falha, e não em produção.
 */
const TERMINATION_GRACE_PERIOD_MS = 40_000;

describe('resolveTimeoutMs', () => {
  it('should use the variable value when it is a positive number', () => {
    expect(resolveTimeoutMs('2500', 9_000)).toBe(2500);
    expect(resolveTimeoutMs('  7000  ', 9_000)).toBe(7000);
  });

  /**
   * Falha para o padrão declarado, nunca para `0` ou `NaN`: um prazo zerado
   * abortaria toda exportação, e um `NaN` faria o SDK lançar na construção do
   * leitor — telemetria derrubando o boot é exatamente o que não pode acontecer.
   */
  it.each([undefined, '', '   ', 'abc', '0', '-1', 'Infinity'])(
    'should fall back to the default for the value %p',
    (raw) => {
      expect(resolveTimeoutMs(raw, 9_000)).toBe(9_000);
    },
  );
});

describe('shutdown budget', () => {
  /**
   * A conta de D19: o que sobra da janela do orquestrador depois da drenagem
   * precisa acomodar o descarregamento **e** o `$disconnect()` do Prisma. Os
   * padrões do SDK (10 s no OTLP, 30 s no leitor de métricas) não cabem — é por
   * isso que estes números existem.
   */
  it('should fit in what is left of the orchestrator window after the drain', () => {
    const remaining = TERMINATION_GRACE_PERIOD_MS - DRAIN_WINDOW_MS;

    expect(TELEMETRY_SHUTDOWN_TIMEOUT_MS).toBeLessThan(remaining);
    expect(remaining - TELEMETRY_SHUTDOWN_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
  });

  /**
   * O teto do hook é rede de segurança: quem de fato **cancela** a exportação
   * são os prazos dos exportadores. Se eles fossem maiores, o hook abandonaria
   * a espera com o handle ainda vivo e o processo seguiria preso.
   */
  it('should keep the exporter timeouts below the hook ceiling', () => {
    expect(DEFAULT_EXPORT_TIMEOUT_MS).toBeLessThan(TELEMETRY_SHUTDOWN_TIMEOUT_MS);
    expect(DEFAULT_METRIC_EXPORT_TIMEOUT_MS).toBeLessThan(TELEMETRY_SHUTDOWN_TIMEOUT_MS);
  });

  /**
   * O leitor periódico recusa um intervalo menor que o prazo de exportação.
   */
  it('should keep the collection interval above the export timeout', () => {
    expect(DEFAULT_METRIC_EXPORT_INTERVAL_MS).toBeGreaterThan(DEFAULT_METRIC_EXPORT_TIMEOUT_MS);
  });
});

describe('resolveMetricExportTiming', () => {
  let diagnostics: DiagnosticsCapture;

  beforeEach(() => {
    diagnostics = captureDiagnostics();
  });

  afterEach(() => {
    diagnostics.restore();
  });

  it('should use the declared defaults when nothing is configured', () => {
    expect(resolveMetricExportTiming({})).toEqual({
      intervalMillis: DEFAULT_METRIC_EXPORT_INTERVAL_MS,
      timeoutMillis: DEFAULT_METRIC_EXPORT_TIMEOUT_MS,
    });
  });

  /**
   * O construtor do leitor periódico **lança** quando o intervalo é menor que o
   * prazo, e num preload isso é fatal: medido antes da correção, qualquer
   * `OTEL_METRIC_EXPORT_INTERVAL` abaixo dos 5 s padrão — `1000` inclusive —
   * derrubava o processo com código 1, sem uma linha em stdout, e a réplica
   * entrava em CrashLoop. Resolver as duas variáveis isoladamente era o buraco.
   */
  it('should shrink the timeout down to the requested interval instead of letting the constructor throw', () => {
    expect(resolveMetricExportTiming({ OTEL_METRIC_EXPORT_INTERVAL: '1000' })).toEqual({
      intervalMillis: 1000,
      timeoutMillis: 1000,
    });
    expect(diagnostics.text()).toContain('metric-timeout-above-interval');
  });

  /**
   * Abaixo do piso o prazo é encolhido junto com o intervalo, e a exportação
   * seguinte começa antes de o socket da anterior ser liberado: sempre sobra um
   * handle vivo e o processo **nunca encerra**. Medido contra destino
   * inalcançável — 25 s sem exit em `1`, `10`, `100` e `500`; exit 0 em `1000`.
   */
  it.each(['1', '10', '100', '500'])(
    'should raise to the floor the interval %p, which prevents the process from exiting',
    (interval) => {
      expect(resolveMetricExportTiming({ OTEL_METRIC_EXPORT_INTERVAL: interval })).toEqual({
        intervalMillis: MIN_METRIC_EXPORT_INTERVAL_MS,
        timeoutMillis: MIN_METRIC_EXPORT_INTERVAL_MS,
      });
      expect(diagnostics.text()).toContain('metric-interval-clamped');
    },
  );

  it('should respect the operator override when it is coherent', () => {
    expect(
      resolveMetricExportTiming({
        OTEL_METRIC_EXPORT_INTERVAL: '30000',
        OTEL_METRIC_EXPORT_TIMEOUT: '3000',
      }),
    ).toEqual({ intervalMillis: 30_000, timeoutMillis: 3_000 });
    expect(diagnostics.text()).toBe('');
  });
});

describe('resolveExportTimeoutMs', () => {
  let diagnostics: DiagnosticsCapture;

  beforeEach(() => {
    diagnostics = captureDiagnostics();
  });

  afterEach(() => {
    diagnostics.restore();
  });

  it('should accept an override that still cancels within the hook ceiling', () => {
    expect(resolveExportTimeoutMs('2000', DEFAULT_EXPORT_TIMEOUT_MS)).toBe(2000);
    expect(diagnostics.text()).toBe('');
  });

  /**
   * Um prazo maior que o teto do hook derrota o teto: o `Promise.race` abandona
   * a espera, o handle da exportação continua vivo, o processo não encerra e o
   * `SIGKILL` corta os hooks seguintes junto.
   */
  it('should reduce an override that would overrun the shutdown window', () => {
    expect(resolveExportTimeoutMs('600000', DEFAULT_EXPORT_TIMEOUT_MS)).toBe(
      DEFAULT_EXPORT_TIMEOUT_MS,
    );
    expect(diagnostics.text()).toContain('export-timeout-clamped');
  });
});
