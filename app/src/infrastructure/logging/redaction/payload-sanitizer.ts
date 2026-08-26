import { classifyFieldName, MAX_FIELD_NAME_LENGTH } from './field-classifier';
import { maskScalar } from './pii-masker';
import { MAX_TEXT_LENGTH, sanitizeText, truncateText } from './text-sanitizer';

export const MAX_DEPTH = 8;
export const MAX_ENTRIES = 1000;
export const MAX_ARRAY_LENGTH = 50;
export const MAX_KEY_LENGTH = MAX_FIELD_NAME_LENGTH;
export const MAX_BODY_JSON_BYTES = 4096;

export const TRUNCATED_MARKER = '[TRUNCATED]';
export const CIRCULAR_MARKER = '[CIRCULAR]';

export interface SanitizePayloadOptions {
  resource?: string;
}

export interface SerializedBody {
  json: string;
  truncated: boolean;
}

/**
 * `descend` devolve um objeto de estado **novo** por spread, então um campo
 * escalar marcado num nó filho nunca chegaria ao pai. `budget` e `truncation`
 * são objetos compartilhados de propósito: é por eles que o corte aplicado no
 * fundo da árvore alcança quem monta o registro.
 */
interface SanitizeState {
  depth: number;
  inheritedPii: boolean;
  isRootPosition: boolean;
  seen: Set<object>;
  budget: { entries: number };
  truncation: { applied: boolean };
  resource?: string;
}

interface SanitizeResult {
  value: unknown;
  truncated: boolean;
}

export function sanitizePayload(value: unknown, options: SanitizePayloadOptions = {}): unknown {
  return sanitizeWithBounds(value, options).value;
}

function sanitizeWithBounds(value: unknown, options: SanitizePayloadOptions): SanitizeResult {
  const truncation = { applied: false };

  const sanitized = sanitizeNode(value, {
    depth: 0,
    inheritedPii: false,
    isRootPosition: true,
    seen: new Set<object>(),
    budget: { entries: MAX_ENTRIES },
    truncation,
    resource: options.resource,
  });

  return { value: sanitized, truncated: truncation.applied };
}

/**
 * `truncated` cobre **todos** os limites, não só o orçamento final de bytes.
 * Profundidade, tamanho de array, orçamento de entradas e corte de string
 * também descartam conteúdo — e o corte de string é o único que não deixa nem
 * marcador em banda, então sem este flag uma `description` de 9 KB virava 2048
 * caracteres sem sinal nenhum de que faltava algo.
 */
export function serializeBody(
  value: unknown,
  options: SanitizePayloadOptions = {},
): SerializedBody | undefined {
  const sanitized = sanitizeWithBounds(value, options);
  const json = JSON.stringify(sanitized.value);

  if (json === undefined) {
    return undefined;
  }

  if (Buffer.byteLength(json, 'utf8') <= MAX_BODY_JSON_BYTES) {
    return { json, truncated: sanitized.truncated };
  }

  return { json: fitToByteBudget(json), truncated: true };
}

/**
 * Acha, por busca binária, o maior prefixo do JSON que ainda cabe no orçamento
 * de bytes **depois de embrulhado** no envelope de truncamento.
 *
 * Um `slice(0, MAX_BODY_JSON_BYTES)` não serve por dois motivos: em UTF-8 um
 * caractere pode ocupar até 4 bytes, e o `JSON.stringify` do envelope re-escapa
 * o conteúdo, então cada `"` ou `\` do prefixo pode dobrar de tamanho. O
 * tamanho final não é função linear do corte, e a busca binária converge em
 * ~12 iterações.
 */
function fitToByteBudget(json: string): string {
  let low = 0;
  let high = json.length;
  let best = envelope('');

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = envelope(json.slice(0, middle));

    if (Buffer.byteLength(candidate, 'utf8') <= MAX_BODY_JSON_BYTES) {
      best = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return best;
}

function envelope(content: string): string {
  return JSON.stringify({ _truncated: true, _content: content });
}

/**
 * Percurso em profundidade, limitado, sobre o valor a ser logado. Em cada nó:
 * classifica a chave (segredo é removido, PII é mascarada), propaga a marca de
 * PII do container para todo descendente escalar, e passa strings pelo scrubber
 * de conteúdo.
 *
 * Os limites — profundidade, orçamento de entradas, tamanho de array, tamanho
 * de string e detecção de ciclo — existem para que um payload hostil não
 * transforme a sanitização em negação de serviço.
 */
function sanitizeNode(value: unknown, state: SanitizeState): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (value.length > MAX_TEXT_LENGTH) {
      markTruncated(state);
    }

    return state.inheritedPii
      ? maskScalar(truncateText(value, MAX_TEXT_LENGTH))
      : sanitizeText(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return state.inheritedPii ? maskScalar(value) : value;
  }

  if (typeof value === 'symbol') {
    return sanitizeText(value.toString());
  }

  if (typeof value === 'function') {
    markTruncated(state);

    return TRUNCATED_MARKER;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (state.depth >= MAX_DEPTH) {
    markTruncated(state);

    return TRUNCATED_MARKER;
  }

  if (state.seen.has(value)) {
    return CIRCULAR_MARKER;
  }

  state.seen.add(value);

  const result = Array.isArray(value) ? sanitizeArray(value, state) : sanitizeObject(value, state);

  state.seen.delete(value);

  return result;
}

function sanitizeArray(value: unknown[], state: SanitizeState): unknown[] {
  const items: unknown[] = [];
  const limit = Math.min(value.length, MAX_ARRAY_LENGTH);

  for (let index = 0; index < limit; index += 1) {
    if (!consumeBudget(state)) {
      items.push(TRUNCATED_MARKER);

      return items;
    }

    items.push(sanitizeNode(value[index], descend(state, false)));
  }

  if (value.length > MAX_ARRAY_LENGTH) {
    markTruncated(state);
    items.push(TRUNCATED_MARKER);
  }

  return items;
}

function sanitizeObject(value: object, state: SanitizeState): Record<string, unknown> {
  const result = Object.create(null) as Record<string, unknown>;
  const occurrences = new Map<string, number>();
  const source = value as Record<string, unknown>;

  for (const key of Object.keys(value)) {
    if (!consumeBudget(state)) {
      result[TRUNCATED_MARKER] = TRUNCATED_MARKER;

      return result;
    }

    const classification = classifyFieldName(key, {
      resource: state.resource,
      isRootPosition: state.isRootPosition,
    });

    if (classification === 'secret') {
      continue;
    }

    assignSanitized(
      result,
      occurrences,
      key,
      sanitizeNode(source[key], descend(state, classification === 'pii')),
    );
  }

  return result;
}

/**
 * A chave é classificada pelo nome **original** e só depois sanitizada pela
 * forma do conteúdo. O nome de propriedade é conteúdo controlado pelo cliente:
 * um payload em forma de mapa (`{ "maria@x.com": … }`) atravessaria a redação inteira.
 */
function assignSanitized(
  result: Record<string, unknown>,
  occurrences: Map<string, number>,
  key: string,
  value: unknown,
): void {
  result[resolveUniqueKey(result, occurrences, sanitizeText(key, MAX_KEY_LENGTH))] = value;
}

/**
 * Truncar e mascarar colapsam chaves distintas na mesma string. Sobrescrever em
 * silêncio perderia um campo exatamente no log que existe para explicar a
 * rejeição, então a colisão vira um sufixo determinístico.
 *
 * O contador **por chave-base** é o que mantém isso linear. Reiniciar a busca em
 * `~2` a cada colisão custava O(n²): mil e-mails distintos que mascaram para a
 * mesma string — alcançáveis sem autenticação em `POST /api/auth/login`, que
 * responde `400` e cai na lista de captura de corpo — davam ~500 mil consultas e
 * 176 ms de event loop por requisição, 14x um corpo do mesmo tamanho sem
 * colisão. Com o contador cada sufixo é testado no máximo uma vez.
 *
 * O laço que sobrou existe só para a colisão artificial: um `foo~2` legítimo já
 * presente no payload. Ele também avança o contador, então não reintroduz o
 * custo quadrático.
 */
function resolveUniqueKey(
  result: Record<string, unknown>,
  occurrences: Map<string, number>,
  key: string,
): string {
  const previous = occurrences.get(key);

  if (previous === undefined) {
    occurrences.set(key, 1);

    return key;
  }

  let occurrence = previous + 1;

  while (Object.prototype.hasOwnProperty.call(result, `${key}~${occurrence}`)) {
    occurrence += 1;
  }

  occurrences.set(key, occurrence);

  return `${key}~${occurrence}`;
}

function markTruncated(state: SanitizeState): void {
  state.truncation.applied = true;
}

function consumeBudget(state: SanitizeState): boolean {
  if (state.budget.entries <= 0) {
    markTruncated(state);

    return false;
  }

  state.budget.entries -= 1;

  return true;
}

function descend(state: SanitizeState, inheritsPii: boolean): SanitizeState {
  return {
    ...state,
    depth: state.depth + 1,
    isRootPosition: false,
    inheritedPii: state.inheritedPii || inheritsPii,
  };
}
