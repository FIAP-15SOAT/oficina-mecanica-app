export type FieldClassification = 'secret' | 'pii' | 'clear';

/**
 * Qualquer sequência de caracteres que não seja letra nem dígito (`_`, `-`, `.`,
 * espaço, `/`). Vira separador, então `api_key`, `api-key`, `api.key` e
 * `api key` produzem exatamente os mesmos tokens.
 */
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]+/gu;

/**
 * Fronteira camelCase: minúscula ou dígito seguida de maiúscula.
 * O `$1 $2` reinsere os dois grupos capturados com um espaço entre eles,
 * então `userId` → `user Id` e `zipCode2` continua intacto até o próximo par.
 */
const CAMEL_BOUNDARY = /([\p{Ll}\p{N}])(\p{Lu})/gu;

/**
 * Fronteira de acrônimo: uma sequência de maiúsculas seguida de maiúscula+minúscula.
 * Sem ela, `APIKey` viraria o token único `apikey` e escaparia da regra
 * `['api', 'key']`. Com ela, `APIKey` → `API Key` → `['api', 'key']`.
 */
const ACRONYM_BOUNDARY = /(\p{Lu}+)(\p{Lu}\p{Ll})/gu;

export const MAX_FIELD_NAME_LENGTH = 128;

/**
 * Quebra um nome de campo na sequência de tokens usada pelas regras abaixo.
 *
 * A classificação é por **sequência de tokens**, nunca por substring — é isso
 * que mantém `monkey` e `passenger` fora das regras `['key']`/`['password']`,
 * e ao mesmo tempo pega `apiKey`, `API_KEY` e `api-key` com uma regra só.
 *
 * O `normalize('NFKC')` (Unicode Normalization Form KC — compatibilidade +
 * composição) roda primeiro para fechar as variantes de **compatibilidade**:
 * sem ele, `ｐａｓｓｗｏｒｄ` em largura total não casaria com `password` e o
 * valor secreto passaria em claro.
 */
export function tokenize(name: string): string[] {
  return splitTokens(boundFieldName(name));
}

function boundFieldName(name: string): string {
  return name.slice(0, MAX_FIELD_NAME_LENGTH).normalize('NFKC');
}

/**
 * O corte fica **aqui**, e não em quem chama, para que nenhum caminho futuro o
 * contorne — os dois pontos de entrada da tokenização passam por esta função.
 */
function splitTokens(name: string): string[] {
  const bounded = name.slice(0, MAX_FIELD_NAME_LENGTH);

  if (!bounded) {
    return [];
  }

  return bounded
    .replace(ACRONYM_BOUNDARY, '$1 $2')
    .replace(CAMEL_BOUNDARY, '$1 $2')
    .replace(NON_ALPHANUMERIC, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter((token) => token.length > 0);
}

/**
 * Sequências que marcam segredo. Casam em **qualquer posição** do nome, porque
 * `userPasswordHash` e `dbConnectionStringValue` continuam sendo segredo, e o
 * valor é **removido** do log, não mascarado.
 */
export const SECRET_SEQUENCES: readonly (readonly string[])[] = [
  ['password'],
  ['token'],
  ['secret'],
  ['authorization'],
  ['credential'],
  ['api', 'key'],
  ['connection', 'string'],
];

/**
 * Sequências que marcam dado pessoal. Casam apenas como **sufixo terminal**,
 * para que `customerName` seja PII mas `nameFormatter` não seja. O valor é
 * mascarado preservando a forma, não removido.
 */
export const PII_SEQUENCES: readonly (readonly string[])[] = [
  ['document'],
  ['cpf'],
  ['cnpj'],
  ['email'],
  ['phone'],
  ['zip', 'code'],
  ['cep'],
  ['street'],
  ['address'],
  ['plate'],
  ['name'],
];

/**
 * Qualificadores neutros que só descrevem a **forma** do valor, nunca o que ele
 * é. Como a regra de dado pessoal casa apenas como sufixo terminal, um deles no
 * fim do nome derrubava a classificação inteira: `phoneNumber` — o nome
 * canônico do campo em inglês — tokeniza em `['phone','number']`, cujo terminal
 * é `number`, e passava em claro. O mesmo valia para `documentNumber`,
 * `plateNumber` e `zipCodeValue`.
 *
 * São removidos do fim antes do teste de sufixo, nunca do início e nunca até
 * esvaziar a lista: `partNumber` continua `['part']` (não é regra de PII) e um
 * campo chamado só `number` continua `['number']`.
 */
export const NEUTRAL_TERMINAL_TOKENS: readonly string[] = ['number', 'value', 'str'];

/**
 * Recursos cujo `name` na raiz do payload é nome de catálogo (peça, serviço), e
 * não nome de pessoa. A isenção é posicional de propósito: vale só na raiz e só
 * nessas rotas, então `customer.name` aninhado continua sendo mascarado.
 */
export const CATALOG_NAME_EXEMPT_RESOURCES: readonly string[] = ['services', 'parts-supplies'];

export interface ClassificationContext {
  resource?: string;
  isRootPosition: boolean;
}

export function extractResourceSegment(urlPath: string): string | undefined {
  const segments = urlPath
    .split('?')[0]
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  const [first, second] = segments;

  if (first === 'api') {
    return second;
  }

  return first;
}

export function classifyFieldName(
  name: string,
  context: ClassificationContext = { isRootPosition: false },
): FieldClassification {
  const bounded = boundFieldName(name);

  if (name.length > MAX_FIELD_NAME_LENGTH || bounded.length > MAX_FIELD_NAME_LENGTH) {
    return 'secret';
  }

  const tokens = splitTokens(bounded);

  if (tokens.length === 0) {
    return 'clear';
  }

  if (SECRET_SEQUENCES.some((sequence) => containsSequence(tokens, sequence))) {
    return 'secret';
  }

  if (isExemptCatalogName(tokens, context)) {
    return 'clear';
  }

  const qualified = stripNeutralQualifiers(tokens);

  if (PII_SEQUENCES.some((sequence) => endsWithSequence(qualified, sequence))) {
    return 'pii';
  }

  return 'clear';
}

function stripNeutralQualifiers(tokens: readonly string[]): readonly string[] {
  let end = tokens.length;

  while (end > 1 && NEUTRAL_TERMINAL_TOKENS.includes(tokens[end - 1])) {
    end -= 1;
  }

  return end === tokens.length ? tokens : tokens.slice(0, end);
}

function isExemptCatalogName(tokens: readonly string[], context: ClassificationContext): boolean {
  return (
    tokens.length === 1 &&
    tokens[0] === 'name' &&
    context.isRootPosition &&
    context.resource !== undefined &&
    CATALOG_NAME_EXEMPT_RESOURCES.includes(context.resource)
  );
}

export function containsSequence(tokens: readonly string[], sequence: readonly string[]): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) {
    return false;
  }

  for (let start = 0; start <= tokens.length - sequence.length; start += 1) {
    if (sequence.every((token, offset) => tokens[start + offset] === token)) {
      return true;
    }
  }

  return false;
}

export function endsWithSequence(tokens: readonly string[], sequence: readonly string[]): boolean {
  if (sequence.length === 0 || sequence.length > tokens.length) {
    return false;
  }

  const start = tokens.length - sequence.length;

  return sequence.every((token, offset) => tokens[start + offset] === token);
}
