import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';

import { MAX_USER_AGENT_LENGTH, REDACTED } from '@infrastructure/logging/redaction/text-sanitizer';
import * as urlAttributes from '@infrastructure/logging/url-attributes';
import { sanitizeUrlPath } from '@infrastructure/logging/url-attributes';
import {
  buildIncomingSpanAttributes,
  extractRequestPathname,
} from '@infrastructure/telemetry/span-request-attributes';
import { captureDiagnostics } from '../../../helpers/diagnostics-capture';

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

interface RequestOptions {
  url?: string;
  headers?: Record<string, string>;
  remoteAddress?: string;
}

/**
 * `IncomingMessage` sintético: o hook roda **antes** do Express, então é isto
 * que ele de fato recebe em produção — sem `path`, sem `query`, sem `ip`.
 */
function createRequest({ url = '/api/work-orders', headers = {}, remoteAddress }: RequestOptions) {
  return {
    url,
    headers,
    socket: { remoteAddress } as Socket,
  } as unknown as IncomingMessage;
}

describe('extractRequestPathname', () => {
  it('should cut at the first question mark', () => {
    expect(extractRequestPathname('/api/quotes/1/decisions?token=abc')).toBe(
      '/api/quotes/1/decisions',
    );
  });

  it('should return the whole path when there is no query', () => {
    expect(extractRequestPathname('/api/work-orders')).toBe('/api/work-orders');
  });

  it('should treat a missing url as empty', () => {
    expect(extractRequestPathname(undefined)).toBe('');
  });
});

describe('buildIncomingSpanAttributes — url.path', () => {
  it('should apply the same sanitization as the access log, not a second policy', () => {
    const path = '/api/customers/123.456.789-09';

    const attributes = buildIncomingSpanAttributes(createRequest({ url: path }));

    expect(attributes['url.path']).toBe(sanitizeUrlPath(path));
    expect(attributes['url.path']).toBe('/api/customers/***.***.789-09');
  });

  it('should mask a percent-encoded e-mail in the path', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ url: '/api/users/maria.silva%40gmail.com' }),
    );

    expect(attributes['url.path']).toBe('/api/users/ma***va@gmail.com');
  });

  // `%2540` decodifica para `%40`, que ainda não tem forma de arroba: uma
  // passagem só deixaria o valor duplamente codificado atravessar.
  it('should decode until stable before scrubbing', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ url: '/api/users/maria%2540gmail.com' }),
    );

    expect(attributes['url.path']).toBe('/api/users/m***@gmail.com');
  });

  it('should remove a percent-encoded signed token from the path', () => {
    const encoded = `/api/x/${JWT.split('.').join('%2E')}`;

    expect(buildIncomingSpanAttributes(createRequest({ url: encoded }))['url.path']).toBe(
      `/api/x/${REDACTED}`,
    );
  });

  it('should sanitize the path without carrying the query along', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ url: '/api/quotes/abc/decisions?token=super-secret' }),
    );

    expect(attributes['url.path']).toBe('/api/quotes/abc/decisions');
    expect(JSON.stringify(attributes)).not.toContain('super-secret');
  });
});

describe('buildIncomingSpanAttributes — url.query', () => {
  /**
   * A proteção da query no log é por **nome de parâmetro** sobre a query já
   * decomposta; aqui só existe o texto bruto, e um token opaco não tem forma
   * que um scrubber reconheça. Emitir "o que dá para sanitizar" seria
   * fail-open, então a chave sai `undefined` — e o span descarta atributo nulo.
   */
  it('should never emit the query, not even sanitized', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ url: `/api/quotes/abc/decisions?token=${JWT}` }),
    );

    expect(attributes['url.query']).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(attributes, 'url.query')).toBe(true);
  });

  it('should not emit a harmless filter query either', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ url: '/api/work-orders?page=1&limit=10' }),
    );

    expect(attributes['url.query']).toBeUndefined();
  });
});

describe('buildIncomingSpanAttributes — client.address', () => {
  it('should omit the address when the forwarded header is not an IP', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ headers: { 'x-forwarded-for': 'maria@x.com' } }),
    );

    expect(attributes['client.address']).toBeUndefined();
  });

  /**
   * A linha de acesso usa `request.ip`, que respeita o `trust proxy`. Sem essa
   * simetria, com a configuração **entregue** (nenhum proxy confiável) o
   * chamador forjava o endereço no span enquanto o log guardava o real — dois
   * valores para a mesma requisição, e o do span vindo de quem se investiga.
   */
  it('should ignore the forwarded header when no proxy is trusted', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({
        headers: { 'x-forwarded-for': '203.0.113.7, 198.51.100.2' },
        remoteAddress: '10.0.0.4',
      }),
    );

    expect(attributes['client.address']).toBe('10.0.0.4');
  });

  /**
   * O salto mais à esquerda é texto do chamador: atrás de um balanceador que
   * apenas acrescenta o seu, quem chama escolhe o que vai ali. Confiar só em
   * `10.0.0.0/8` significa acreditar em **um** salto para trás — o que
   * `10.0.0.4` reportou —, e `203.0.113.7` fica sem verificação possível.
   */
  it('should stop at the first untrusted hop, never at the caller-supplied one', () => {
    process.env.TRUSTED_PROXY_CIDRS = '10.0.0.0/8';

    try {
      const attributes = buildIncomingSpanAttributes(
        createRequest({
          headers: { 'x-forwarded-for': '203.0.113.7, 198.51.100.2' },
          remoteAddress: '10.0.0.4',
        }),
      );

      expect(attributes['client.address']).toBe('198.51.100.2');
    } finally {
      delete process.env.TRUSTED_PROXY_CIDRS;
    }
  });

  /**
   * Configurar proxies confiáveis não autoriza o cabeçalho de **qualquer** par:
   * um peer fora da faixa é conexão direta, e o cabeçalho que ele mandou não
   * vale nada. Antes desta correção o span aceitava o cabeçalho sempre que
   * houvesse alguma faixa configurada, sem olhar de quem a conexão vinha.
   */
  it('should ignore the forwarded header when the peer is outside the trusted range', () => {
    process.env.TRUSTED_PROXY_CIDRS = '10.0.0.0/8';

    try {
      const attributes = buildIncomingSpanAttributes(
        createRequest({
          headers: { 'x-forwarded-for': '203.0.113.7, 198.51.100.2' },
          remoteAddress: '192.0.2.5',
        }),
      );

      expect(attributes['client.address']).toBe('192.0.2.5');
    } finally {
      delete process.env.TRUSTED_PROXY_CIDRS;
    }
  });

  /**
   * Falha fechada, como `applyTrustProxy` do outro lado: uma lista que o
   * `proxy-addr` recusa vira "nenhum salto confiável", nunca "todos".
   */
  it('should trust no hop when the configured list is invalid', () => {
    process.env.TRUSTED_PROXY_CIDRS = 'faixa-invalida';

    try {
      const attributes = buildIncomingSpanAttributes(
        createRequest({
          headers: { 'x-forwarded-for': '203.0.113.7' },
          remoteAddress: '10.0.0.4',
        }),
      );

      expect(attributes['client.address']).toBe('10.0.0.4');
    } finally {
      delete process.env.TRUSTED_PROXY_CIDRS;
    }
  });

  it('should fall back to the socket address when there is no forwarded header', () => {
    const attributes = buildIncomingSpanAttributes(createRequest({ remoteAddress: '10.0.0.4' }));

    expect(attributes['client.address']).toBe('10.0.0.4');
  });

  it('should omit the address when not even the socket carries a valid IP', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ headers: { 'x-forwarded-for': 'not-an-ip' }, remoteAddress: undefined }),
    );

    expect(attributes['client.address']).toBeUndefined();
  });
});

describe('buildIncomingSpanAttributes — user_agent.original', () => {
  it('should truncate at the same per-attribute limit the access log uses', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ headers: { 'user-agent': 'a'.repeat(MAX_USER_AGENT_LENGTH + 500) } }),
    );

    expect((attributes['user_agent.original'] as string).length).toBeLessThanOrEqual(
      MAX_USER_AGENT_LENGTH,
    );
  });

  it('should scrub sensitive content like any free text', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ headers: { 'user-agent': `curl/8.0 ${JWT}` } }),
    );

    expect(attributes['user_agent.original']).toBe(`curl/8.0 ${REDACTED}`);
  });

  it('should omit the attribute when the header is absent', () => {
    expect(buildIncomingSpanAttributes(createRequest({}))['user_agent.original']).toBeUndefined();
  });
});

describe('buildIncomingSpanAttributes — server.address', () => {
  /**
   * A instrumentação deriva `server.address` e `server.port` de
   * `Forwarded`/`X-Forwarded-Host`/`Host`, sem validar, sem truncar e sem
   * recorrer ao socket. Medido antes da correção: um `Host` de 322 caracteres
   * com um e-mail dentro saía inteiro no span — e a linha de acesso não carrega
   * esse atributo em forma nenhuma, então não há sanitização equivalente a
   * reaproveitar. Removidos por subtração, como a query.
   */
  it.each(['host', 'x-forwarded-host'])('should not emit a server address from %s', (header) => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ headers: { [header]: `maria.silva@gmail.com-${'a'.repeat(300)}:999999` } }),
    );

    expect(attributes['server.address']).toBeUndefined();
    expect(attributes['server.port']).toBeUndefined();
    expect(JSON.stringify(attributes)).not.toContain('maria.silva@gmail.com');
  });
});

describe('buildIncomingSpanAttributes — surface', () => {
  /**
   * O hook é de **subtração**: só sobrescreve o que a instrumentação emitiria
   * cru. Qualquer chave nova aqui seria um atributo fora da cadeia de redação.
   */
  it('should not introduce any attribute beyond the overridden ones', () => {
    const attributes = buildIncomingSpanAttributes(
      createRequest({ headers: { authorization: 'Bearer super-secret', cookie: 'a=b' } }),
    );

    expect(Object.keys(attributes).sort()).toEqual([
      'client.address',
      'server.address',
      'server.port',
      'url.path',
      'url.query',
      'user_agent.original',
    ]);
    expect(JSON.stringify(attributes)).not.toContain('super-secret');
  });
});

describe('buildIncomingSpanAttributes — non-throwing boundary', () => {
  /**
   * Um throw aqui seria fail-**open**: a instrumentação embrulha o hook em
   * `safeExecuteInTheMiddle` com `rethrow: false`, e um retorno `undefined`
   * deixa intactos os atributos crus dela — incluindo a `url.query` que este
   * hook existe para remover. O fallback precisa ser o conjunto **fechado**.
   */
  it('should return the closed set when sanitization fails', () => {
    const diagnostics = captureDiagnostics();
    const explode = jest.spyOn(urlAttributes, 'sanitizeUrlPath').mockImplementation(() => {
      throw new Error('scrubber quebrou');
    });

    const attributes = buildIncomingSpanAttributes(
      createRequest({
        url: `/api/quotes/abc/decisions?token=${JWT}`,
        headers: { 'user-agent': JWT, 'x-forwarded-for': '203.0.113.7' },
      }),
    );

    expect(attributes['url.path']).toBe(REDACTED);
    expect(attributes['url.query']).toBeUndefined();
    expect(attributes['client.address']).toBeUndefined();
    expect(attributes['user_agent.original']).toBeUndefined();
    expect(attributes['server.address']).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(attributes, 'url.query')).toBe(true);
    expect(diagnostics.text()).toContain('sanitization');

    explode.mockRestore();
    diagnostics.restore();
  });
});
