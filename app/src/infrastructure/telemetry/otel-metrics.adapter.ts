import { Injectable } from '@nestjs/common';
import { Attributes, Counter, Histogram, Meter, metrics } from '@opentelemetry/api';

import { BusinessMetricDefinition } from '@application/metrics/business-metric';
import { MetricAttributes } from '@application/metrics/metric-attribute';
import { IMetrics } from '@application/ports/output/metrics.service.interface';
import { NoExtraFields } from '@application/ports/output/no-extra-fields';

import { resolveMetricAttribute, resolveMetricKey } from './metric-registry';
import { reportTelemetryFailure } from './telemetry-diagnostics';

export const BUSINESS_METER_NAME = 'oficina.business';

type AttributeValue = string | number | boolean;

@Injectable()
export class OtelMetricsAdapter implements IMetrics {
  private readonly meter: Meter;

  private readonly counters = new Map<string, Counter>();

  private readonly histograms = new Map<string, Histogram>();

  constructor() {
    this.meter = metrics.getMeter(BUSINESS_METER_NAME);
  }

  increment<TAttributes extends MetricAttributes, TGiven extends TAttributes>(
    definition: BusinessMetricDefinition<TAttributes>,
    attributes: NoExtraFields<TAttributes, TGiven>,
  ): void {
    this.emit(definition, 'counter', attributes, (key, translated) =>
      this.resolveCounter(key, definition).add(1, translated),
    );
  }

  record<TAttributes extends MetricAttributes, TGiven extends TAttributes>(
    definition: BusinessMetricDefinition<TAttributes>,
    value: number,
    attributes: NoExtraFields<TAttributes, TGiven>,
  ): void {
    this.emit(definition, 'histogram', attributes, (key, translated) =>
      this.resolveHistogram(key, definition).record(value, translated),
    );
  }

  private emit(
    definition: BusinessMetricDefinition,
    expectedKind: BusinessMetricDefinition['kind'],
    attributes: MetricAttributes,
    apply: (key: string, attributes: Attributes) => void,
  ): void {
    try {
      if (definition.kind !== expectedKind) {
        reportTelemetryFailure('metric-emission', `instrument-mismatch:${definition.name}`);

        return;
      }

      apply(resolveMetricKey(definition.name), this.translate(attributes));
    } catch (error) {
      reportTelemetryFailure('metric-emission', error);
    }
  }

  /**
   * A restrição por métrica é de compilação (`NoExtraFields`). Aqui a validação
   * é contra o vocabulário lógico inteiro, e o que ele não conhece é
   * **descartado** com um diagnóstico — nunca emitido sob o nome cru, que é
   * como uma chave não declarada entraria no destino.
   */
  private translate(attributes: MetricAttributes): Attributes {
    const translated: Attributes = {};

    for (const [name, value] of Object.entries(attributes)) {
      const definition = resolveMetricAttribute(name);

      if (!definition) {
        reportTelemetryFailure('metric-emission', `undeclared-attribute:${name}`);

        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      if (!isAttributeValue(value)) {
        reportTelemetryFailure('metric-emission', `invalid-attribute-value:${name}`);

        continue;
      }

      translated[definition.key] = value;
    }

    return translated;
  }

  private resolveCounter(key: string, definition: BusinessMetricDefinition): Counter {
    const existing = this.counters.get(key);

    if (existing) {
      return existing;
    }

    const counter = this.meter.createCounter(key, {
      unit: definition.unit,
      description: definition.description,
    });

    this.counters.set(key, counter);

    return counter;
  }

  private resolveHistogram(key: string, definition: BusinessMetricDefinition): Histogram {
    const existing = this.histograms.get(key);

    if (existing) {
      return existing;
    }

    const histogram = this.meter.createHistogram(key, {
      unit: definition.unit,
      description: definition.description,
    });

    this.histograms.set(key, histogram);

    return histogram;
  }
}

function isAttributeValue(value: unknown): value is AttributeValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}
