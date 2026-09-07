import { context, isSpanContextValid, trace } from '@opentelemetry/api';

export interface TraceCorrelationFields {
  trace_id?: string;
  span_id?: string;
  trace_flags?: string;
}

export function buildTraceCorrelation(): TraceCorrelationFields {
  const spanContext = trace.getSpan(context.active())?.spanContext();

  if (!spanContext || !isSpanContextValid(spanContext)) {
    return {};
  }

  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
    // String de dois dígitos hexadecimais, como manda a convenção: `01` para
    // amostrado. Emitir o número cru quebraria o tipo declarado no dicionário.
    trace_flags: spanContext.traceFlags.toString(16).padStart(2, '0'),
  };
}
