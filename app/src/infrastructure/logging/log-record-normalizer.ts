import { describeError } from './error-serializer';
import { isDeclaredField } from './field-registry';
import { reportLoggingFailure } from './logging-diagnostics';

const LIBRARY_ERROR_KEYS = new Set(['err', 'error']);

/**
 * Último portão antes da linha sair: converte o objeto de erro que as bibliotecas
 * anexam (`err`/`error`) nos atributos `exception.*` e descarta qualquer chave
 * não declarada no registro de campos.
 *
 * É o que garante que a saída é um esquema fechado. Um atributo novo que escape
 * sem declaração chega ao backend com tipo indefinido — e um campo cujo tipo
 * varia entre registros faz o índice derrubar o evento inteiro, não só o campo.
 */
export function normalizeLogRecord(record: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const key of Object.keys(record)) {
    try {
      const value = record[key];

      if (LIBRARY_ERROR_KEYS.has(key) && value instanceof Error) {
        Object.assign(normalized, describeError(value));

        continue;
      }

      if (!isDeclaredField(key)) {
        continue;
      }

      normalized[key] = value;
    } catch (error) {
      reportLoggingFailure('serialization', {
        field: key,
        errorType: error instanceof Error ? error.name : typeof error,
      });
    }
  }

  return normalized;
}
