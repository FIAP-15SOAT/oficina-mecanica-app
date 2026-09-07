import { metrics } from '@opentelemetry/api';
import {
  AggregationTemporality,
  DataPointType,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
  ResourceMetrics,
} from '@opentelemetry/sdk-metrics';

import { BUSINESS_METRICS } from '@application/metrics/business-metric.catalog';
import { METRIC_ATTRIBUTE_REGISTRY, METRIC_VIEWS } from '@infrastructure/telemetry/metric-registry';
import { OtelMetricsAdapter } from '@infrastructure/telemetry/otel-metrics.adapter';
import { captureDiagnostics, DiagnosticsCapture } from '../../../helpers/diagnostics-capture';

const ONE_MINUTE_SECONDS = 60;
const THREE_HOURS_SECONDS = 3 * 60 * 60;
const FIVE_DAYS_SECONDS = 5 * 24 * 60 * 60;

interface Harness {
  adapter: OtelMetricsAdapter;
  collect: () => Promise<ResourceMetrics>;
  shutdown: () => Promise<void>;
}

function createHarness(): Harness {
  const exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA);
  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: 600_000,
    exportTimeoutMillis: 5_000,
  });
  const provider = new MeterProvider({ readers: [reader], views: [...METRIC_VIEWS] });

  metrics.setGlobalMeterProvider(provider);

  return {
    adapter: new OtelMetricsAdapter(),
    collect: async () => (await reader.collect()).resourceMetrics,
    shutdown: async () => {
      await provider.shutdown();
      metrics.disable();
    },
  };
}

function findMetric(resourceMetrics: ResourceMetrics, name: string) {
  return resourceMetrics.scopeMetrics
    .flatMap((scope) => scope.metrics)
    .find((metric) => metric.descriptor.name === name);
}

describe('OtelMetricsAdapter', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  afterEach(async () => {
    await harness.shutdown();
  });

  describe('logical to physical name translation', () => {
    it('should emit the counter under the registry physical name, in the owned namespace', async () => {
      harness.adapter.increment(BUSINESS_METRICS.WORK_ORDER_CREATED, {});

      const metric = findMetric(await harness.collect(), 'oficina.work_order.created');

      expect(metric?.descriptor.unit).toBe('{work_order}');
      expect(metric?.dataPoints[0].value).toBe(1);
    });

    it('should translate the logical attribute name to the declared physical key', async () => {
      harness.adapter.record(BUSINESS_METRICS.WORK_ORDER_STATUS_DURATION, 42, {
        workOrderStatus: 'APPROVED',
      });

      const metric = findMetric(await harness.collect(), 'oficina.work_order.status.duration');

      expect(metric?.dataPoints[0].attributes).toEqual({
        [METRIC_ATTRIBUTE_REGISTRY.workOrderStatus.key]: 'APPROVED',
      });
      expect(metric?.descriptor.unit).toBe('s');
    });
  });

  describe('undeclared attribute rejection', () => {
    let diagnostics: DiagnosticsCapture;

    beforeEach(() => {
      diagnostics = captureDiagnostics();
    });

    afterEach(() => {
      diagnostics.restore();
    });

    /**
     * A restrição por métrica é de compilação (`NoExtraFields`); esta é a
     * segunda linha, contra o que atravessar um `as`. Um atributo desconhecido
     * emitido sob o nome cru entraria no destino como série nova.
     */
    it('should drop an attribute the logical vocabulary does not know', async () => {
      harness.adapter.record(BUSINESS_METRICS.WORK_ORDER_STATUS_DURATION, 10, {
        workOrderStatus: 'APPROVED',
        workOrderId: 'e2a1b0c4-0000-4000-8000-000000000000',
      } as unknown as { workOrderStatus: string });

      const metric = findMetric(await harness.collect(), 'oficina.work_order.status.duration');

      expect(metric?.dataPoints[0].attributes).toEqual({
        [METRIC_ATTRIBUTE_REGISTRY.workOrderStatus.key]: 'APPROVED',
      });
      expect(diagnostics.text()).toContain('undeclared-attribute:workOrderId');
    });

    /**
     * Atributo ausente não vira série nova nem string "undefined": ele
     * simplesmente não entra, e a métrica continua comparável com as demais.
     */
    it('should ignore an attribute whose value was not provided', async () => {
      harness.adapter.record(BUSINESS_METRICS.WORK_ORDER_STATUS_DURATION, 5, {
        workOrderStatus: undefined,
      } as unknown as { workOrderStatus: string });

      const metric = findMetric(await harness.collect(), 'oficina.work_order.status.duration');

      expect(metric?.dataPoints[0].attributes).toEqual({});
      expect(diagnostics.text()).toBe('');
    });

    it('should drop an attribute value that is not an accepted primitive', async () => {
      harness.adapter.record(BUSINESS_METRICS.WORK_ORDER_STATUS_DURATION, 5, {
        workOrderStatus: { toString: () => 'APPROVED' },
      } as unknown as { workOrderStatus: string });

      const metric = findMetric(await harness.collect(), 'oficina.work_order.status.duration');

      expect(metric?.dataPoints[0].attributes).toEqual({});
      expect(diagnostics.text()).toContain('invalid-attribute-value:workOrderStatus');
    });

    it('should report and not emit when the instrument does not match the operation', async () => {
      harness.adapter.increment(BUSINESS_METRICS.WORK_ORDER_STATUS_DURATION, {} as never);

      expect(
        findMetric(await harness.collect(), 'oficina.work_order.status.duration'),
      ).toBeUndefined();
      expect(diagnostics.text()).toContain('instrument-mismatch');
    });

    /**
     * Fronteira não-lançante: uma operação de negócio já confirmada nunca pode
     * virar erro por causa de telemetria.
     */
    it('should absorb an emission failure without propagating', () => {
      const failing = new OtelMetricsAdapter();
      jest
        .spyOn(failing as unknown as { resolveCounter: () => never }, 'resolveCounter')
        .mockImplementation(() => {
          throw new Error('meter indisponível');
        });

      expect(() => failing.increment(BUSINESS_METRICS.WORK_ORDER_CREATED, {})).not.toThrow();
      expect(diagnostics.text()).toContain('metric-emission');
    });
  });

  describe('instrument lifecycle', () => {
    it('should create the instrument only once across emissions', async () => {
      const createCounter = jest.spyOn(metrics.getMeter('probe'), 'createCounter');
      const adapter = new OtelMetricsAdapter();

      adapter.increment(BUSINESS_METRICS.WORK_ORDER_CREATED, {});
      adapter.increment(BUSINESS_METRICS.WORK_ORDER_CREATED, {});
      adapter.increment(BUSINESS_METRICS.WORK_ORDER_CREATED, {});

      const metric = findMetric(await harness.collect(), 'oficina.work_order.created');

      expect(metric?.dataPoints).toHaveLength(1);
      expect(metric?.dataPoints[0].value).toBe(3);

      createCounter.mockRestore();
    });
  });

  describe('aggregation declared in the registry', () => {
    /**
     * A agregação padrão de histograma termina em 10 000 e é dimensionada para
     * **milissegundos** de requisição; permanências vão de minutos a dias em
     * **segundos**, e toda observação cairia no último balde. A média
     * continuaria certa e os percentis — a razão de existir do painel — não
     * teriam significado, sem nada falhar.
     */
    it('should place 60 s, 3 h and 5 days in different buckets', async () => {
      for (const seconds of [ONE_MINUTE_SECONDS, THREE_HOURS_SECONDS, FIVE_DAYS_SECONDS]) {
        harness.adapter.record(
          BUSINESS_METRICS.WORK_ORDER_DIAGNOSIS_TO_COMPLETION_DURATION,
          seconds,
          {},
        );
      }

      const metric = findMetric(
        await harness.collect(),
        'oficina.work_order.diagnosis_to_completion.duration',
      );

      expect(metric?.dataPointType).toBe(DataPointType.EXPONENTIAL_HISTOGRAM);

      const point = metric?.dataPoints[0].value as {
        count: number;
        min: number;
        max: number;
        positive: { bucketCounts: number[] };
      };

      expect(point.count).toBe(3);
      expect(point.min).toBe(ONE_MINUTE_SECONDS);
      expect(point.max).toBe(FIVE_DAYS_SECONDS);
      expect(point.positive.bucketCounts.filter((count) => count > 0)).toHaveLength(3);
    });

    it('should apply the same aggregation to the three business durations', () => {
      expect(METRIC_VIEWS.map((view) => view.instrumentName).sort()).toEqual([
        'oficina.work_order.diagnosis_to_completion.duration',
        'oficina.work_order.lead_time.duration',
        'oficina.work_order.status.duration',
      ]);
    });
  });
});
