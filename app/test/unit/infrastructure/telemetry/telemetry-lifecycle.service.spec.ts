import { TelemetryLifecycleService } from '@infrastructure/telemetry/telemetry-lifecycle.service';
import { registerTelemetrySdk } from '@infrastructure/telemetry/telemetry-sdk.registry';
import { captureDiagnostics, DiagnosticsCapture } from '../../../helpers/diagnostics-capture';

describe('TelemetryLifecycleService', () => {
  let service: TelemetryLifecycleService;
  let diagnostics: DiagnosticsCapture;

  beforeEach(() => {
    service = new TelemetryLifecycleService();
    diagnostics = captureDiagnostics();
  });

  afterEach(() => {
    diagnostics.restore();
    registerTelemetrySdk(undefined);
  });

  /**
   * A regressão que este teste impede é exatamente a que aconteceu com o
   * `$disconnect()` do Prisma, e é **silenciosa**: o Nest executa
   * `callDestroyHook -> callBeforeShutdownHook -> dispose -> callShutdownHook`,
   * então descarregar em `onModuleDestroy` exportaria os spans das requisições
   * ainda em voo. Nenhum teste de comportamento pegaria isso — os dois jeitos
   * "funcionam".
   */
  it('should flush on onApplicationShutdown, not on onModuleDestroy', () => {
    expect(typeof service.onApplicationShutdown).toBe('function');
    expect((service as unknown as Record<string, unknown>).onModuleDestroy).toBeUndefined();
    expect(
      (service as unknown as Record<string, unknown>).beforeApplicationShutdown,
    ).toBeUndefined();
  });

  it('should call shutdown on the instance registered by the preload', async () => {
    const shutdown = jest.fn().mockResolvedValue(undefined);
    registerTelemetrySdk({ shutdown });

    await service.onApplicationShutdown();

    expect(shutdown).toHaveBeenCalledTimes(1);
  });

  it('should do nothing when telemetry is disabled', async () => {
    await expect(service.onApplicationShutdown()).resolves.toBeUndefined();
    expect(diagnostics.text()).toBe('');
  });

  it('should absorb a flush failure and report it on the error channel', async () => {
    registerTelemetrySdk({ shutdown: jest.fn().mockRejectedValue(new Error('export failed')) });

    await expect(service.onApplicationShutdown()).resolves.toBeUndefined();

    const [line] = diagnostics.lines();
    expect(line['oficina.telemetry.failure.stage']).toBe('shutdown');
    expect(line.message).toBe('telemetry failure');
  });

  /**
   * Um destino que aceita a conexão e nunca responde não pode consumir a janela
   * de encerramento inteira: o `SIGKILL` cortaria os hooks seguintes junto.
   */
  it('should give up waiting when the flush never completes', async () => {
    jest.useFakeTimers();
    registerTelemetrySdk({ shutdown: () => new Promise<void>(() => undefined) });

    const pending = service.onApplicationShutdown();
    jest.runOnlyPendingTimers();

    await expect(pending).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});
