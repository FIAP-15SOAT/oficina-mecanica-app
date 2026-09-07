/* eslint-disable @typescript-eslint/no-require-imports --
 * `jest.isolateModules` recebe um callback **síncrono**: o registro de módulos
 * precisa ser trocado e restaurado dentro dele, e um `import()` dinâmico só
 * resolveria depois que o isolamento já terminou. Este é o único lugar do
 * projeto que carrega o preload de propósito, e ele precisa de um registro
 * limpo por caso de teste.
 */
import { metrics, trace } from '@opentelemetry/api';

import {
  getTelemetrySdk,
  registerTelemetrySdk,
} from '@infrastructure/telemetry/telemetry-sdk.registry';

/**
 * O interruptor é a **ausência** de endereço de destino, e não uma variável
 * dedicada de habilitação — que seria uma segunda verdade sobre o mesmo estado.
 * É o que mantém as suítes E2E e o desenvolvimento local sem exportador de
 * fundo, e o que torna "observabilidade fora ⇒ aplicação fora" impossível por
 * construção.
 */
describe('otel — disabled when no endpoint is configured', () => {
  const OTEL_KEYS = [
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'OTEL_LOGS_EXPORTER',
    'OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE',
  ] as const;

  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(OTEL_KEYS.map((key) => [key, process.env[key]]));

    for (const key of OTEL_KEYS) {
      delete process.env[key];
    }

    registerTelemetrySdk(undefined);
  });

  afterEach(() => {
    for (const key of OTEL_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }

    registerTelemetrySdk(undefined);
  });

  it('should not instantiate the SDK nor register the instance', () => {
    jest.isolateModules(() => {
      const { telemetrySdk } = require('../../src/otel') as { telemetrySdk?: unknown };

      expect(telemetrySdk).toBeUndefined();
    });

    expect(getTelemetrySdk()).toBeUndefined();
  });

  /**
   * `applyPipelineDefaults` só roda depois do interruptor. As variáveis
   * intactas são a prova observável de que nada foi construído.
   */
  it('should not apply any pipeline configuration', () => {
    jest.isolateModules(() => {
      require('../../src/otel');
    });

    expect(process.env.OTEL_LOGS_EXPORTER).toBeUndefined();
    expect(process.env.OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE).toBeUndefined();
  });

  it('should leave the global API providers as no-op', () => {
    jest.isolateModules(() => {
      require('../../src/otel');
    });

    expect(metrics.getMeterProvider().constructor.name).toBe('NoopMeterProvider');
    expect(trace.getTracerProvider().constructor.name).toBe('ProxyTracerProvider');
  });

  it('should treat a blank endpoint as absent', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = '   ';

    jest.isolateModules(() => {
      const { telemetrySdk } = require('../../src/otel') as { telemetrySdk?: unknown };

      expect(telemetrySdk).toBeUndefined();
    });

    expect(process.env.OTEL_LOGS_EXPORTER).toBeUndefined();
  });
});
