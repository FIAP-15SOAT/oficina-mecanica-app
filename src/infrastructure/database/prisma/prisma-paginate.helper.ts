import { PaginationInput, PaginatedRepositoryResult } from '@domain/interfaces/common/pagination.interface';

/**
 * Delegate genérico do Prisma com tipagem mínima necessária.
 * Aceita qualquer delegate que possua findMany e count.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaModelDelegate<TResult> = {
  findMany(args?: Record<string, unknown>): Promise<TResult[]>;
  count(args?: Record<string, unknown>): Promise<number>;
};

/**
 * Helper genérico de paginação para uso nos repositories Prisma.
 * Executa findMany + count em paralelo e retorna { items, total }.
 *
 * @param delegate - Delegate do Prisma (ex: prisma.service, prisma.customer)
 * @param args     - Argumentos do findMany (where, orderBy, include, etc.) — sem skip/take
 * @param input    - Input de paginação com page e limit
 */
export async function paginate<TResult>(
  delegate: PrismaModelDelegate<TResult>,
  args: Record<string, unknown>,
  input: PaginationInput,
): Promise<PaginatedRepositoryResult<TResult>> {
  const skip = (input.page - 1) * input.limit;

  const [items, total] = await Promise.all([
    delegate.findMany({ ...args, skip, take: input.limit }),
    delegate.count({ where: (args as { where?: unknown }).where }),
  ]);

  return { items, total };
}
