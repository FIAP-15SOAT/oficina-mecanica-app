import pino, { DestinationStream } from 'pino';

import { reportDestinationFailure } from './logging-diagnostics';

/**
 * Destino padrão: stream para o fd 1 (stdout), em modo síncrono.
 *
 * `sync: true` porque o buffer assíncrono do pino perde as últimas linhas quando
 * o processo morre de repente — crash, OOM kill do k8s —, que é justamente
 * quando elas importam.
 *
 * O handler de `error` é obrigatório, não zelo: um evento `'error'` sem listener
 * em stream do Node derruba o processo, então um `stdout` quebrado — EPIPE
 * quando o coletor cai — faria o logging matar a aplicação que ele existe para
 * observar.
 *
 * Mora em arquivo próprio, e não no módulo, porque `*.module.ts` fica fora do
 * `collectCoverageFrom`: aqui as duas decisões acima ficam cobertas por spec.
 */
export function createDefaultDestination(): DestinationStream {
  const destination = pino.destination({ dest: 1, sync: true });

  destination.on('error', () => reportDestinationFailure());

  return destination;
}
