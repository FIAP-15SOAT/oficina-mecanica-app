# Design: Ordenação da Listagem de Ordens de Serviço por Status e Data

**Data:** 2026-05-30  
**Escopo:** Alteração exclusiva na query de listagem de OS — nenhuma regra de negócio, entidade ou transição de status é afetada.

---

## Problema

A listagem atual ordena por `createdAt DESC` (mais recente primeiro), ignorando qualquer prioridade de status. Uma OS recém-criada com status `RECEIVED` aparece antes de uma OS `IN_PROGRESS` mais antiga.

## Requisito

Ordenar a listagem de OS por prioridade de status, e dentro de cada status pelo mais antigo primeiro.

**Ordem de prioridade (do mais urgente ao menos urgente):**

| Prioridade | Status             | Nome exibido           |
|------------|--------------------|------------------------|
| 1          | `IN_PROGRESS`      | Em Execução            |
| 2          | `AWAITING_APPROVAL`| Aguardando Aprovação   |
| 3          | `IN_DIAGNOSIS`     | Diagnóstico            |
| 4          | `RECEIVED`         | Recebida               |
| 5          | demais status      | (sem prioridade específica) |

Dentro de cada grupo de status: `createdAt ASC` (mais antiga primeiro).

## Solução

### Por que não Prisma `findMany` puro

O Prisma não suporta `ORDER BY CASE` no `orderBy`. Ordenar por status alfabeticamente não respeita a prioridade de negócio.

### Abordagem: `prisma.$queryRaw` com `Prisma.sql`

Substituir o `findMany` do método `findAllPaginated` por `prisma.$queryRaw` usando template tag `Prisma.sql` — que parametriza automaticamente os valores, eliminando risco de SQL injection.

**SQL resultante:**

```sql
ORDER BY
  CASE status
    WHEN 'IN_PROGRESS'        THEN 1
    WHEN 'AWAITING_APPROVAL'  THEN 2
    WHEN 'IN_DIAGNOSIS'       THEN 3
    WHEN 'RECEIVED'           THEN 4
    ELSE 5
  END,
  created_at ASC
```

A contagem total para paginação usa `prisma.workOrder.count()` com os mesmos filtros — evitando duplicar a query raw.

## Arquivos alterados

- `src/infrastructure/repositories/prisma-work-order.repository.ts` — único arquivo modificado

## O que não muda

- Enum `WorkOrderStatus` — inalterado
- Entidades de domínio — inalteradas
- Use-cases — inalterados
- Controller/DTOs — inalterados
- Filtros existentes (number, customerId, vehicleId, assignedUserId, status) — continuam funcionando
- Transições de status e regras de negócio — inalteradas
