export interface TelemetrySdk {
  shutdown(): Promise<void>;
}

let registered: TelemetrySdk | undefined;

/**
 * Ponte entre o preload e o contêiner de injeção: `src/otel.ts` é carregado por
 * `--require`, muito antes de o Nest existir, e registra aqui a instância que
 * criou. O hook de encerramento a recupera pelo require cache, sem importar o
 * preload — que, importado, arrastaria o SDK inteiro para dentro de todo
 * processo, inclusive as suítes E2E, onde a telemetria está desligada e nada
 * disso precisa ser carregado.
 */
export function registerTelemetrySdk(sdk: TelemetrySdk | undefined): void {
  registered = sdk;
}

export function getTelemetrySdk(): TelemetrySdk | undefined {
  return registered;
}
