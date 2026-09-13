import { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import type { Attributes } from '@opentelemetry/api';
import proxyaddr from 'proxy-addr';

import { resolveLoggerConfig } from '@infrastructure/logging/logger.config';
import { runSafely } from '@infrastructure/logging/logging-diagnostics';
import {
  MAX_USER_AGENT_LENGTH,
  REDACTED,
  sanitizeText,
} from '@infrastructure/logging/redaction/text-sanitizer';
import { sanitizeUrlPath } from '@infrastructure/logging/url-attributes';

export function buildIncomingSpanAttributes(request: IncomingMessage): Attributes {
  return runSafely('sanitization', () => buildAttributes(request), buildFailClosedAttributes());
}

function buildFailClosedAttributes(): Attributes {
  return {
    'url.path': REDACTED,
    'url.query': undefined,
    'client.address': undefined,
    'user_agent.original': undefined,
    'server.address': undefined,
    'server.port': undefined,
  };
}

function buildAttributes(request: IncomingMessage): Attributes {
  return {
    'url.path': sanitizeUrlPath(extractRequestPathname(request.url)),
    'url.query': undefined,
    'client.address': resolveClientAddress(request),
    'user_agent.original': resolveUserAgent(request),
    'server.address': undefined,
    'server.port': undefined,
  };
}

export function extractRequestPathname(url: string | null = ''): string {
  if (url === null) {
    return '';
  }

  const queryStart = url.indexOf('?');

  return queryStart === -1 ? url : url.slice(0, queryStart);
}

/**
 * Mesma resolução que a linha de acesso, pelo **mesmo** `proxy-addr` que o
 * Express usa por baixo do `req.ip`, e alimentado pela **mesma**
 * `TRUSTED_PROXY_CIDRS`. Não é duplicação por escolha: o hook roda no
 * `emit('request')` do `http`, antes de qualquer middleware, e ali o objeto
 * ainda é `IncomingMessage` — `req.ip` não existe para ser reaproveitado.
 */
function resolveClientAddress(request: IncomingMessage): string | undefined {
  const address = proxyaddr(request, resolveTrust());

  return address && isIP(address) !== 0 ? address : undefined;
}

let cachedTrustKey: string | undefined;
let cachedTrust: ReturnType<typeof proxyaddr.compile> | undefined;

/**
 * A compilação percorre e valida os CIDRs, e isto roda por requisição — daí a
 * memoização, chaveada pela própria configuração para que uma mudança de
 * ambiente ainda seja observada.
 */
function resolveTrust(): ReturnType<typeof proxyaddr.compile> {
  const { trustedProxies } = resolveLoggerConfig();
  const key = trustedProxies === false ? '' : trustedProxies.join(',');

  if (cachedTrust && cachedTrustKey === key) {
    return cachedTrust;
  }

  cachedTrustKey = key;
  cachedTrust = compileTrust(trustedProxies);

  return cachedTrust;
}

/**
 * `proxyaddr.compile([])` é o que o Express monta para `trust proxy` desligado:
 * não confia em salto nenhum e devolve o endereço do socket. Uma lista inválida
 * cai no mesmo lugar — falha fechada, como `applyTrustProxy` faz do outro lado.
 */
function compileTrust(trustedProxies: string[] | false): ReturnType<typeof proxyaddr.compile> {
  try {
    return proxyaddr.compile(trustedProxies === false ? [] : trustedProxies);
  } catch {
    return proxyaddr.compile([]);
  }
}

function resolveUserAgent(request: IncomingMessage): string | undefined {
  const value = request.headers['user-agent'];

  return value ? sanitizeText(value, MAX_USER_AGENT_LENGTH) : undefined;
}
