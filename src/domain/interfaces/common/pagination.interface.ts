/**
 * Metadados de paginação retornados pelos use cases.
 */
export interface PaginationMeta {
  totalRecords: number;
  totalPages: number;
  page: number;
  limit: number;
}

/**
 * Resultado paginado genérico retornado pelos use cases.
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Input base de paginação. Todas as DTOs de input paginado devem extender esta interface.
 */
export interface PaginationInput {
  page: number;
  limit: number;
}

/**
 * Resultado paginado retornado pelos repositories.
 */
export interface PaginatedRepositoryResult<T> {
  items: T[];
  total: number;
}
