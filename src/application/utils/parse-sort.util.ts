import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

export function parseSort(raw: string | undefined): SortCriterion[] {
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
        throw new DomainValidationException(
          'Formato de ordenação inválido: campo não pode ser vazio.',
        );
      }

      if (direction !== SortDirection.ASC && direction !== SortDirection.DESC) {
        throw new DomainValidationException(
          `Formato de ordenação inválido: direção '${rawDir}' não permitida. Use 'asc' ou 'desc'.`,
        );
      }

      return {
        field,
        direction: direction === SortDirection.ASC ? SortDirection.ASC : SortDirection.DESC,
      };
    });
}
