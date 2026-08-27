# Work Order Listing — Ordenação por Status e Data

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ordenar a listagem de OS por prioridade de status (IN_PROGRESS > AWAITING_APPROVAL > IN_DIAGNOSIS > RECEIVED > demais) e dentro de cada status pelo mais antigo primeiro (`createdAt ASC`), sem alterar nenhuma regra de negócio.

**Architecture:** O Prisma não suporta `ORDER BY CASE` nativo no `findMany`. A solução usa `prisma.$queryRaw(Prisma.sql`...`)` para buscar os IDs ordenados, `prisma.workOrder.count()` para o total paginado, e um segundo `findMany` para carregar os registros completos com relações (`customer`, `vehicle`, `assignedUser`). Os IDs são reordenados em memória após o `findMany` para preservar a ordem do banco.

**Tech Stack:** NestJS, Prisma 5.x, PostgreSQL, Jest, TypeScript

---

## Arquivo modificado

| Ação   | Arquivo |
|--------|---------|
| Modify | `src/infrastructure/repositories/prisma-work-order.repository.ts` — método `findAllPaginated` |
| Modify | `test/unit/infrastructure/repositories/prisma-work-order.repository.spec.ts` — bloco `findAllPaginated` |

---

## Task 1: Reescrever `findAllPaginated` com ordenação por status

**Files:**
- Modify: `src/infrastructure/repositories/prisma-work-order.repository.ts:80-110`

- [ ] **Step 1: Escrever o teste que falha para a ordenação**

No arquivo `test/unit/infrastructure/repositories/prisma-work-order.repository.spec.ts`, dentro do `describe('findAllPaginated')`, adicione os seguintes casos de teste **antes** de qualquer alteração na implementação:

```typescript
it('should return results ordered by status priority (IN_PROGRESS before AWAITING_APPROVAL)', async () => {
  const idInProgress = randomUUID();
  const idAwaiting = randomUUID();

  prisma.$queryRaw.mockResolvedValue([{ id: idInProgress }, { id: idAwaiting }]);
  prisma.workOrder.count.mockResolvedValue(2);
  // findMany retorna fora de ordem — o repositório deve reordenar
  prisma.workOrder.findMany.mockResolvedValue([
    { id: idAwaiting, number: '000002', status: WorkOrderStatus.AWAITING_APPROVAL, createdAt: new Date() },
    { id: idInProgress, number: '000001', status: WorkOrderStatus.IN_PROGRESS, createdAt: new Date() },
  ]);

  const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

  expect(result.total).toBe(2);
  expect(result.items[0]).toMatchObject({ id: idInProgress });
  expect(result.items[1]).toMatchObject({ id: idAwaiting });
});

it('should call $queryRaw for ordered IDs', async () => {
  prisma.$queryRaw.mockResolvedValue([]);
  prisma.workOrder.count.mockResolvedValue(0);

  await repository.findAllPaginated({ page: 1, limit: 10 }, {});

  expect(prisma.$queryRaw).toHaveBeenCalled();
});

it('should return empty list when no results', async () => {
  prisma.$queryRaw.mockResolvedValue([]);
  prisma.workOrder.count.mockResolvedValue(0);

  const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

  expect(result.items).toEqual([]);
  expect(result.total).toBe(0);
  expect(prisma.workOrder.findMany).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar os novos testes para confirmar que falham**

```bash
npx jest prisma-work-order.repository.spec --no-coverage 2>&1 | tail -30
```

Esperado: falha nos novos testes (`$queryRaw` não chamado, ordem errada).

- [ ] **Step 3: Implementar a nova versão de `findAllPaginated`**

Substitua o método `findAllPaginated` inteiro (linhas 80–110) em `src/infrastructure/repositories/prisma-work-order.repository.ts`:

```typescript
async findAllPaginated(
  pagination: PaginationInput,
  filters: WorkOrderFilters,
): Promise<PaginatedRepositoryResult<WorkOrder>> {
  const { number, customerId, vehicleId, assignedUserId, status } = filters;
  const { page, limit } = pagination;

  // Prisma where para count (type-safe, filtros idênticos)
  const where: Prisma.WorkOrderWhereInput = {};
  if (number) where.number = { contains: number.trim(), mode: 'insensitive' };
  if (customerId) where.customerId = customerId;
  if (vehicleId) where.vehicleId = vehicleId;
  if (assignedUserId) where.assignedUserId = assignedUserId;
  if (status) where.status = status;

  // Condições SQL para a query de IDs ordenados
  const conditions: Prisma.Sql[] = [];
  if (number) conditions.push(Prisma.sql`"number" ILIKE ${'%' + number.trim() + '%'}`);
  if (customerId) conditions.push(Prisma.sql`customer_id = ${customerId}::uuid`);
  if (vehicleId) conditions.push(Prisma.sql`vehicle_id = ${vehicleId}::uuid`);
  if (assignedUserId) conditions.push(Prisma.sql`assigned_user_id = ${assignedUserId}::uuid`);
  if (status) conditions.push(Prisma.sql`status::text = ${status}`);

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;

  const offset = (page - 1) * limit;

  const query = Prisma.sql`
    SELECT id FROM work_orders
    ${whereClause}
    ORDER BY
      CASE status::text
        WHEN 'IN_PROGRESS'        THEN 1
        WHEN 'AWAITING_APPROVAL'  THEN 2
        WHEN 'IN_DIAGNOSIS'       THEN 3
        WHEN 'RECEIVED'           THEN 4
        ELSE 5
      END,
      created_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [total, orderedRows] = await Promise.all([
    this.prisma.workOrder.count({ where }),
    this.prisma.$queryRaw<{ id: string }[]>(query),
  ]);

  if (orderedRows.length === 0) {
    return { items: [], total };
  }

  const orderedIds = orderedRows.map((r) => r.id);

  const records = await this.prisma.workOrder.findMany({
    where: { id: { in: orderedIds } },
    include: WORK_ORDER_LIST_INCLUDE,
  });

  // Restaura a ordem do $queryRaw (IN clause não garante ordem)
  const idIndexMap = new Map(orderedIds.map((id, i) => [id, i]));
  records.sort((a, b) => (idIndexMap.get(a.id) ?? 0) - (idIndexMap.get(b.id) ?? 0));

  return {
    items: records.map((r) =>
      WorkOrderMapper.toDomain(r as Parameters<typeof WorkOrderMapper.toDomain>[0]),
    ),
    total,
  };
}
```

- [ ] **Step 4: Atualizar os testes existentes do `findAllPaginated` que agora falham**

Os testes existentes assertam que `findMany` é chamado com os filtros — mas agora `findMany` é chamado apenas com `{ id: { in: orderedIds } }`. Os filtros passam pelo `count`. Atualize os 3 testes existentes:

```typescript
it('should filter by customerId', async () => {
  const customerId = randomUUID();
  prisma.$queryRaw.mockResolvedValue([]);
  prisma.workOrder.count.mockResolvedValue(0);

  const result = await repository.findAllPaginated({ page: 1, limit: 10 }, { customerId });

  expect(result.total).toBe(0);
  expect(prisma.workOrder.count).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ customerId }) }),
  );
  expect(prisma.$queryRaw).toHaveBeenCalled();
});

it('should filter by vehicleId', async () => {
  const vehicleId = randomUUID();
  prisma.$queryRaw.mockResolvedValue([]);
  prisma.workOrder.count.mockResolvedValue(0);

  const result = await repository.findAllPaginated({ page: 1, limit: 10 }, { vehicleId });

  expect(result.total).toBe(0);
  expect(prisma.workOrder.count).toHaveBeenCalledWith(
    expect.objectContaining({ where: expect.objectContaining({ vehicleId }) }),
  );
  expect(prisma.$queryRaw).toHaveBeenCalled();
});

it('should apply extra filters', async () => {
  prisma.$queryRaw.mockResolvedValue([]);
  prisma.workOrder.count.mockResolvedValue(0);

  const assignedUserId = randomUUID();
  await repository.findAllPaginated(
    { page: 1, limit: 10 },
    {
      number: '001',
      assignedUserId,
      status: WorkOrderStatus.IN_PROGRESS,
    },
  );

  expect(prisma.workOrder.count).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        number: { contains: '001', mode: 'insensitive' },
        assignedUserId,
        status: WorkOrderStatus.IN_PROGRESS,
      }),
    }),
  );
  expect(prisma.$queryRaw).toHaveBeenCalled();
});
```

- [ ] **Step 5: Rodar todos os testes do repositório**

```bash
npx jest prisma-work-order.repository.spec --no-coverage 2>&1 | tail -30
```

Esperado: todos os testes passando (`PASS`).

- [ ] **Step 6: Rodar a suite completa**

```bash
npx jest --no-coverage 2>&1 | tail -20
```

Esperado: nenhuma regressão em outros testes.

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/repositories/prisma-work-order.repository.ts \
        test/unit/infrastructure/repositories/prisma-work-order.repository.spec.ts
git commit -m "feat: ordenar listagem de OS por prioridade de status e data de criação

Substitui orderBy createdAt desc por $queryRaw com ORDER BY CASE status
seguindo a ordem: IN_PROGRESS > AWAITING_APPROVAL > IN_DIAGNOSIS >
RECEIVED > demais. Dentro de cada status, ordena pelo mais antigo
primeiro (createdAt ASC). Filtros e paginação permanecem inalterados."
```

---

## Self-Review

**Spec coverage:**
- ✓ Ordenação IN_PROGRESS > AWAITING_APPROVAL > IN_DIAGNOSIS > RECEIVED — implementado no CASE
- ✓ Mais antigas primeiro — `created_at ASC` após o CASE
- ✓ Filtros existentes preservados — where object no count + condições SQL na query raw
- ✓ Nenhuma regra de negócio alterada — apenas o método `findAllPaginated`

**Placeholder scan:** nenhum TBD ou TODO encontrado.

**Type consistency:** `orderedIds: string[]`, `idIndexMap: Map<string, number>`, `records` retornados pelo `findMany` — tipos consistentes em todas as referências.
