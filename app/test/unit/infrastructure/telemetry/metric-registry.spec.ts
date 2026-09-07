import { AggregationType } from '@opentelemetry/sdk-metrics';

import { BusinessMetricDefinition, BusinessMetricName } from '@application/metrics/business-metric';
import { BUSINESS_METRICS } from '@application/metrics/business-metric.catalog';
import { MetricAttributeName, MetricAttributes } from '@application/metrics/metric-attribute';
import {
  METRIC_ATTRIBUTE_REGISTRY,
  METRIC_REGISTRY,
  MetricCardinality,
  resolveMetricAttribute,
  resolveMetricKey,
} from '@infrastructure/telemetry/metric-registry';

type AttributesOf<TDefinition> =
  TDefinition extends BusinessMetricDefinition<infer TAttributes> ? keyof TAttributes : never;

type CatalogAttributeName = AttributesOf<(typeof BUSINESS_METRICS)[keyof typeof BUSINESS_METRICS]>;

type CatalogMetricName = (typeof BUSINESS_METRICS)[keyof typeof BUSINESS_METRICS]['name'];

type Assert<T extends true> = T;

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * Falha de compilação nas duas direções: uma métrica declarada no vocabulário
 * que nenhuma entrada do catálogo emite (entrada morta), ou uma métrica do
 * catálogo sem entrada no registry (nome físico inexistente em runtime). O
 * `Record<BusinessMetricName, ...>` do registry fecha a segunda direção; esta
 * asserção fecha a primeira.
 */
type _CatalogMatchesVocabulary = Assert<MutuallyAssignable<CatalogMetricName, BusinessMetricName>>;

/**
 * Todo atributo que o catálogo declara precisa existir no vocabulário lógico —
 * caso contrário o adaptador o descartaria em runtime, e a métrica sairia sem a
 * dimensão que o painel espera.
 */
type _AttributesBelongToVocabulary = Assert<
  [CatalogAttributeName] extends [MetricAttributeName] ? true : false
>;

/**
 * `high` não pertence ao tipo: declarar cardinalidade alta num atributo de
 * métrica é **erro de compilação**, não revisão esquecida. É o que impede
 * identificador de ordem de serviço, de cliente ou de usuário de virar
 * dimensão e multiplicar séries sem limite.
 */
type _NoHighCardinalityAttribute = Assert<'high' extends MetricCardinality ? false : true>;

describe('metric registry', () => {
  it('should declare a physical name for every metric in the catalog', () => {
    for (const definition of Object.values(BUSINESS_METRICS)) {
      expect(resolveMetricKey(definition.name)).toBeDefined();
    }
  });

  it('should keep physical names inside the application owned namespace', () => {
    for (const entry of Object.values(METRIC_REGISTRY)) {
      expect(entry.key.startsWith('oficina.')).toBe(true);
    }
  });

  /**
   * A convenção não define este atributo, e estender um namespace dela é
   * proibido: `oficina.work_order.status`, nunca `work_order.status`.
   */
  it('should keep attribute names inside the owned namespace', () => {
    for (const entry of Object.values(METRIC_ATTRIBUTE_REGISTRY)) {
      expect(entry.key.startsWith('oficina.')).toBe(true);
    }
  });

  it('should declare exponential aggregation for every business duration', () => {
    const durations = Object.values(BUSINESS_METRICS).filter(
      (definition) => definition.unit === 's',
    );

    expect(durations).toHaveLength(3);

    for (const definition of durations) {
      expect(METRIC_REGISTRY[definition.name].aggregation.type).toBe(
        AggregationType.EXPONENTIAL_HISTOGRAM,
      );
    }
  });

  it('should not declare a custom aggregation for the counter', () => {
    expect(METRIC_REGISTRY[BUSINESS_METRICS.WORK_ORDER_CREATED.name].aggregation.type).toBe(
      AggregationType.DEFAULT,
    );
  });

  /**
   * Identificador de entidade como atributo multiplica séries temporais sem
   * limite, com custo proporcional ao tráfego.
   */
  it('should not declare any entity identifier as an attribute', () => {
    const forbidden = ['id', 'customer', 'user', 'vehicle', 'number'];

    for (const name of Object.keys(METRIC_ATTRIBUTE_REGISTRY) as MetricAttributeName[]) {
      for (const token of forbidden) {
        expect(name.toLowerCase()).not.toContain(token);
      }
    }
  });

  it('should return undefined for an attribute outside the logical vocabulary', () => {
    expect(resolveMetricAttribute('workOrderId')).toBeUndefined();
    expect(resolveMetricAttribute('workOrderStatus')).toBeDefined();
  });

  it('should keep the catalog attribute type compatible with the vocabulary', () => {
    const attributes: MetricAttributes = { workOrderStatus: 'APPROVED' };

    expect(Object.keys(attributes)).toEqual(['workOrderStatus']);
  });
});
