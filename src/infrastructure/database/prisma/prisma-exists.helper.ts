type CountableDelegate = {
  count(args?: Record<string, unknown>): Promise<number>;
};

/**
 * Helper genérico de verificação de existência para uso nos repositories Prisma.
 * Usa count com take: 1 para que o banco pare na primeira linha encontrada,
 * evitando varredura completa e tráfego de colunas desnecessárias.
 *
 * @param delegate - Delegate do Prisma (ex: prisma.vehicle, prisma.workOrder)
 * @param where    - Filtro de existência
 */
export async function existsBy(
  delegate: CountableDelegate,
  where: Record<string, unknown>,
): Promise<boolean> {
  return (await delegate.count({ where, take: 1 })) > 0;
}
