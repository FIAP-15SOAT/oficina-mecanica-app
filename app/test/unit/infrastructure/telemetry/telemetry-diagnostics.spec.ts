import { MAX_TEXT_LENGTH, REDACTED } from '@infrastructure/logging/redaction/text-sanitizer';
import {
  createTelemetryDiagLogger,
  MAX_TELEMETRY_DETAIL_LENGTH,
  MAX_TRACKED_CAUSES,
  reportTelemetryFailure,
  TELEMETRY_FAILURE_MESSAGE,
} from '@infrastructure/telemetry/telemetry-diagnostics';
import { captureDiagnostics, DiagnosticsCapture } from '../../../helpers/diagnostics-capture';

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

describe('reportTelemetryFailure', () => {
  let diagnostics: DiagnosticsCapture;

  beforeEach(() => {
    diagnostics = captureDiagnostics();
  });

  afterEach(() => {
    diagnostics.restore();
  });

  /**
   * O canal é o mesmo do logging — stderr, com o mesmo envelope e os mesmos
   * atributos de recurso. Uma linha destas em **stdout** quebraria o contrato de
   * um objeto JSON por linha com todas as chaves declaradas.
   */
  it('should write to the error channel with the envelope and resource attributes', () => {
    reportTelemetryFailure('shutdown');

    const [line] = diagnostics.lines();

    expect(line.message).toBe(TELEMETRY_FAILURE_MESSAGE);
    expect(line.level).toBe('error');
    expect(line['service.name']).toBeDefined();
    expect(line['oficina.telemetry.failure.stage']).toBe('shutdown');
    expect(line).not.toHaveProperty('oficina.telemetry.failure.detail');
  });

  it('should describe an error by name and message, without the stack', () => {
    reportTelemetryFailure('metric-emission', new TypeError('meter indisponível'));

    const [line] = diagnostics.lines();

    expect(line['oficina.telemetry.failure.detail']).toBe('TypeError: meter indisponível');
  });

  it('should describe a non-textual detail by type, never by value', () => {
    reportTelemetryFailure('diagnostic', { endpoint: 'http://interno:4318' });

    expect(diagnostics.text()).toContain('"oficina.telemetry.failure.detail":"object"');
    expect(diagnostics.text()).not.toContain('interno');
  });
});

describe('createTelemetryDiagLogger', () => {
  let diagnostics: DiagnosticsCapture;

  beforeEach(() => {
    diagnostics = captureDiagnostics();
  });

  afterEach(() => {
    diagnostics.restore();
  });

  it.each(['error', 'warn'] as const)('should forward %s to the error channel', (level) => {
    createTelemetryDiagLogger()[level]('falha ao exportar');

    const [line] = diagnostics.lines();

    expect(line['oficina.telemetry.failure.stage']).toBe('diagnostic');
    expect(line['oficina.telemetry.failure.detail']).toContain('falha ao exportar');
  });

  it.each(['info', 'debug', 'verbose'] as const)('should not emit a line for %s', (level) => {
    createTelemetryDiagLogger()[level]('detalhe de rotina');

    expect(diagnostics.text()).toBe('');
  });

  /**
   * Medido: o `globalErrorHandler` do OTel entrega ao `diag` o erro
   * **serializado com o stack inteiro** — ~2 KB de caminhos absolutos por
   * ocorrência, repetidos a cada intervalo do leitor periódico.
   */
  it('should cut the detail at its own limit, well below the log free text limit', () => {
    expect(MAX_TELEMETRY_DETAIL_LENGTH).toBeLessThan(MAX_TEXT_LENGTH);

    createTelemetryDiagLogger().error('x'.repeat(5_000));

    const [line] = diagnostics.lines();

    expect((line['oficina.telemetry.failure.detail'] as string).length).toBeLessThanOrEqual(
      MAX_TELEMETRY_DETAIL_LENGTH,
    );
  });

  /**
   * O texto vem da biblioteca e pode carregar endpoint, cabeçalho ou mensagem
   * de driver: o canal de diagnóstico não pode virar a via de vazamento que a
   * redação existe para fechar.
   */
  it('should scrub the library text with the same scrubber the log uses', () => {
    createTelemetryDiagLogger().error('falha ao exportar', new Error(`token=${JWT}`));

    expect(diagnostics.text()).not.toContain(JWT.slice(0, 40));
    expect(diagnostics.text()).toContain(REDACTED);
  });
});

describe('reportTelemetryFailure — severity and repetition', () => {
  let diagnostics: DiagnosticsCapture;

  beforeEach(() => {
    diagnostics = captureDiagnostics();
  });

  afterEach(() => {
    diagnostics.restore();
  });

  /**
   * O descarte de span por fila cheia chega como `diag.warn` e é comportamento
   * **declarado como aceito**. Achatá-lo em `error` — como o canal fazia — torna
   * inútil qualquer alerta sobre este stream: o caminho degradado normal fica
   * indistinguível de uma falha real.
   */
  it('should preserve the severity of the reporter', () => {
    reportTelemetryFailure('diagnostic', 'fila cheia', 'warn');
    reportTelemetryFailure('shutdown', 'export falhou', 'error');

    expect(diagnostics.lines().map((line) => line.level)).toEqual(['warn', 'error']);
  });

  /**
   * Medido no smoke: 60 s contra um destino inalcançável produziram 78 linhas
   * idênticas. Sem teto, a falha da observabilidade passa a dominar o canal de
   * erro da própria aplicação e esconde o resto.
   */
  it('should emit the first occurrence and aggregate repetitions of the same cause', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      reportTelemetryFailure('diagnostic', 'connect ECONNREFUSED');
    }

    expect(diagnostics.lines()).toHaveLength(1);
  });

  it('should not suppress a different cause', () => {
    reportTelemetryFailure('diagnostic', 'connect ECONNREFUSED');
    reportTelemetryFailure('diagnostic', 'socket hang up');

    expect(diagnostics.lines()).toHaveLength(2);
  });

  /**
   * O mapa de causas é estado de módulo e vive tanto quanto o processo: sem
   * teto, um detalhe com parte variável (porta efêmera, id de tentativa) cria
   * uma entrada por ocorrência e o canal de diagnóstico passa a vazar memória.
   */
  it('should drop the tracked causes once the ceiling is reached', () => {
    for (let cause = 0; cause < MAX_TRACKED_CAUSES; cause += 1) {
      reportTelemetryFailure('diagnostic', `connect ECONNREFUSED 10.0.0.${cause}`);
    }

    reportTelemetryFailure('diagnostic', 'connect ECONNREFUSED 198.51.100.1');
    reportTelemetryFailure('diagnostic', 'connect ECONNREFUSED 10.0.0.0');

    expect(diagnostics.lines()).toHaveLength(MAX_TRACKED_CAUSES + 2);
  });

  it('should count suppressed occurrences on the next line of the same cause', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    reportTelemetryFailure('diagnostic', 'connect ECONNREFUSED');
    reportTelemetryFailure('diagnostic', 'connect ECONNREFUSED');
    reportTelemetryFailure('diagnostic', 'connect ECONNREFUSED');

    jest.setSystemTime(new Date('2026-01-01T00:02:00.000Z'));
    reportTelemetryFailure('diagnostic', 'connect ECONNREFUSED');

    const lines = diagnostics.lines();

    expect(lines).toHaveLength(2);
    expect(lines[1]['oficina.telemetry.failure.suppressed']).toBe('2');

    jest.useRealTimers();
  });
});
