import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';
import { BadRequestException } from '@application/exceptions/bad-request.exception';

export function parseSort(raw: string | undefined, allowedFields?: Set<string>): SortCriterion[] {
  if (!raw?.trim()) return [];

  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [rawField, rawDir = 'asc'] = part.split(':').map((s) => s.trim());
      const direction = rawDir.toLowerCase();
      const field = rawField?.trim();

      if (!field) {
        throw new BadRequestException(
          'Formato de ordenação inválido: campo não pode ser vazio.',
        );
      }

      if (allowedFields && !allowedFields.has(field)) {
        throw new BadRequestException(
          `Campo '${field}' não é permitido para ordenação. Campos permitidos: ${[...allowedFields].join(', ')}`,
        );
      }

      if (direction !== SortDirection.ASC && direction !== SortDirection.DESC) {
        throw new BadRequestException(
          `Formato de ordenação inválido: direção '${rawDir}' não permitida. Use 'asc' ou 'desc'.`,
        );
      }

      return {
        field,
        direction: direction === SortDirection.ASC ? SortDirection.ASC : SortDirection.DESC,
      };
    });
}
