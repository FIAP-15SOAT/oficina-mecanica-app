import { Span, SpanContext, trace, TraceFlags } from '@opentelemetry/api';

import { buildTraceCorrelation } from '@infrastructure/logging/trace-correlation';

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const SPAN_ID = '00f067aa0ba902b7';

function withSpanContext(spanContext: SpanContext | undefined): jest.SpyInstance {
  const span = spanContext ? ({ spanContext: () => spanContext } as Span) : undefined;

  return jest.spyOn(trace, 'getSpan').mockReturnValue(span);
}

describe('buildTraceCorrelation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Ausência é o contrato: um identificador vazio ou sintético é pior que a
   * falta do campo, porque leva o destino a correlacionar com um traço que não
   * existe. É o caso das linhas de bootstrap e de encerramento.
   */
  it('should return an empty object when there is no active span', () => {
    withSpanContext(undefined);

    expect(buildTraceCorrelation()).toEqual({});
  });

  it('should return an empty object when the span context is invalid', () => {
    withSpanContext({
      traceId: '00000000000000000000000000000000',
      spanId: '0000000000000000',
      traceFlags: TraceFlags.NONE,
    });

    expect(buildTraceCorrelation()).toEqual({});
  });

  it('should emit the real identifiers using the non-OTLP mapping spelling', () => {
    withSpanContext({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: TraceFlags.SAMPLED });

    expect(buildTraceCorrelation()).toEqual({
      trace_id: TRACE_ID,
      span_id: SPAN_ID,
      trace_flags: '01',
    });
  });

  /**
   * `trace_flags` é **string** de dois dígitos hexadecimais, e não número: o
   * dicionário de campos declara `string`, e emitir o valor cru quebraria a
   * asserção de tipo do E2E.
   */
  it('should emit trace_flags as a two-digit hexadecimal string', () => {
    withSpanContext({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: TraceFlags.NONE });

    expect(buildTraceCorrelation().trace_flags).toBe('00');
  });

  it('should not add any key beyond the three correlation fields', () => {
    withSpanContext({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: TraceFlags.SAMPLED });

    expect(Object.keys(buildTraceCorrelation()).sort()).toEqual([
      'span_id',
      'trace_flags',
      'trace_id',
    ]);
  });
});
