# Work Order Sort Parameter — Clean Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar parâmetro `sortBy` opcional ao endpoint de listagem de OS, com prioridade de status definida no domínio e aplicação do default no use case, seguindo clean architecture.

**Architecture:** A prioridade dos status é uma regra de negócio — vive no domínio como constante. O use case é responsável pelo default (`STATUS_PRIORITY`). O repositório recebe o critério e executa o `ORDER BY` correspondente. A apresentação expõe o parâmetro via query string validada por enum.

**Tech Stack:** NestJS, Prisma 5.x, PostgreSQL, Jest, TypeScript, class-validator, @nestjs/swagger

---

## Arquivos

| Ação   | Arquivo |
|--------|---------|
| Criar  | `src/domain/enums/work-order-sort-by.enum.ts` |
| Criar  | `src/domain/constants/work-order-status-priority.constant.ts` |
| Modify | `src/domain/interfaces/repositories/work-order.repository.interface.ts` |
| Modify | `src/domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto.ts` |
| Modify | `src/application/use-cases/work-order/find-all-work-orders-paginated.use-case.ts` |
| Modify | `src/presentation/work-order/dto/filter-work-orders.dto.ts` |
| Modify | `src/infrastructure/repositories/prisma-work-order.repository.ts` |
| Test   | `test/unit/application/use-cases/work-order/find-all-work-orders-paginated.use-case.spec.ts` |
| Test   | `test/unit/infrastructure/repositories/prisma-work-order.repository.spec.ts` |

---

## Task 1: Domain — enum WorkOrderSortBy e constante de prioridade de status

**Files:**
- Create: `src/domain/enums/work-order-sort-by.enum.ts`
- Create: `src/domain/constants/work-order-status-priority.constant.ts`
- Modify: `src/domain/interfaces/repositories/work-order.repository.interface.ts`
- Modify: `src/domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto.ts`

- [ ] **Step 1: Criar o enum WorkOrderSortBy**

```typescript
// src/domain/enums/work-order-sort-by.enum.ts
export enum WorkOrderSortBy {
  STATUS_PRIORITY = 'status',
  CREATED_AT = 'createdAt',
}
```

- [ ] **Step 2: Criar a constante de prioridade de status**

A prioridade segue o fluxo operacional do mais ativo para o menos ativo. Todos os 9 status devem ter prioridade explícita — sem ELSE genérico.

```typescript
// src/domain/constants/work-order-status-priority.constant.ts
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export const WORK_ORDER_STATUS_PRIORITY: Record<WorkOrderStatus, number> = {
  [WorkOrderStatus.IN_PROGRESS]:       1,
  [WorkOrderStatus.AWAITING_APPROVAL]: 2,
  [WorkOrderStatus.APPROVED]:          3,
  [WorkOrderStatus.IN_DIAGNOSIS]:      4,
  [WorkOrderStatus.RECEIVED]:          5,
  [WorkOrderStatus.REJECTED]:          6,
  [WorkOrderStatus.CANCELLED]:         7,
  [WorkOrderStatus.COMPLETED]:         8,
  [WorkOrderStatus.DELIVERED]:         9,
};
```

- [ ] **Step 3: Adicionar `sortBy` à interface WorkOrderFilters no repositório**

Arquivo: `src/domain/interfaces/repositories/work-order.repository.interface.ts`

Adicione o import e o campo. O arquivo completo fica:

```typescript
import { WorkOrder } from '../../entities/work-order.entity';
import { WorkOrderService } from '../../entities/work-order-service.entity';
import { WorkOrderPartSupply } from '../../entities/work-order-part-supply.entity';
import { WorkOrderStatus } from '../../enums/work-order-status.enum';
import { WorkOrderSortBy } from '../../enums/work-order-sort-by.enum';
import { PaginatedRepositoryResult, PaginationInput } from '../common/pagination.interface';

export interface WorkOrderFilters {
  number?: string;
  customerId?: string;
  vehicleId?: string;
  assignedUserId?: string;
  status?: WorkOrderStatus;
  sortBy?: WorkOrderSortBy;
}

export interface IWorkOrderRepository {
  create(workOrder: WorkOrder): Promise<WorkOrder>;
  findById(id: string): Promise<WorkOrder | null>;
  findByIdWithDetails(id: string): Promise<WorkOrder | null>;
  findAllPaginated(
    pagination: PaginationInput,
    filters: WorkOrderFilters,
  ): Promise<PaginatedRepositoryResult<WorkOrder>>;
  update(workOrder: WorkOrder): Promise<WorkOrder>;
  generateNextNumber(): Promise<string>;
  addServiceItems(items: WorkOrderService[]): Promise<void>;
  updateServiceItemStatus(workOrder: WorkOrder, item: WorkOrderService): Promise<void>;
  addPartSupplyItems(items: WorkOrderPartSupply[]): Promise<void>;
}
```

- [ ] **Step 4: Adicionar `sortBy` ao DTO de filtros do use case**

Arquivo: `src/domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto.ts`

```typescript
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { WorkOrderSortBy } from '@domain/enums/work-order-sort-by.enum';

export interface FindAllWorkOrdersFilters extends PaginationInput {
  number?: string;
  customerId?: string;
  vehicleId?: string;
  assignedUserId?: string;
  status?: WorkOrderStatus;
  sortBy?: WorkOrderSortBy;
}
```

- [ ] **Step 5: Verificar compilação TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add \
  src/domain/enums/work-order-sort-by.enum.ts \
  src/domain/constants/work-order-status-priority.constant.ts \
  src/domain/interfaces/repositories/work-order.repository.interface.ts \
  src/domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto.ts
git commit -m "feat(domain): adicionar WorkOrderSortBy enum e constante de prioridade de status"
```

---

## Task 2: Use Case — aplicar sortBy com default STATUS_PRIORITY

**Files:**
- Modify: `src/application/use-cases/work-order/find-all-work-orders-paginated.use-case.ts`
- Test: `test/unit/application/use-cases/work-order/find-all-work-orders-paginated.use-case.spec.ts`

- [ ] **Step 1: Escrever os testes que falham**

Substitua o conteúdo de `test/unit/application/use-cases/work-order/find-all-work-orders-paginated.use-case.spec.ts`:

```typescript
import { FindAllWorkOrdersPaginatedUseCase } from '@application/use-cases/work-order/find-all-work-orders-paginated.use-case';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { WorkOrderSortBy } from '@domain/enums/work-order-sort-by.enum';
import {
  createMockWorkOrder,
  createMockWorkOrderRepository,
} from '../../../../helpers/work-order-mock.factory';

describe('FindAllWorkOrdersPaginatedUseCase', () => {
  let useCase: FindAllWorkOrdersPaginatedUseCase;
  let workOrderRepository: jest.Mocked<IWorkOrderRepository>;

  beforeEach(() => {
    workOrderRepository = createMockWorkOrderRepository();
    useCase = new FindAllWorkOrdersPaginatedUseCase(workOrderRepository);
  });

  it('should return paginated work orders', async () => {
    const wo = createMockWorkOrder();
    const input = { page: 1, limit: 10 };

    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [wo], total: 1 });

    const result = await useCase.execute(input);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toBe(wo);
    expect(result.pagination.totalRecords).toBe(1);
    expect(result.pagination.page).toBe(1);
    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { sortBy: WorkOrderSortBy.STATUS_PRIORITY },
    );
  });

  it('should return empty when no work orders', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalRecords).toBe(0);
  });

  it('should pass filters to repository with default sortBy', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });
    const input = { page: 2, limit: 5, customerId: 'cust-1' };

    await useCase.execute(input);

    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 2, limit: 5 },
      { customerId: 'cust-1', sortBy: WorkOrderSortBy.STATUS_PRIORITY },
    );
  });

  it('should forward explicit sortBy to repository', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, limit: 10, sortBy: WorkOrderSortBy.CREATED_AT });

    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { sortBy: WorkOrderSortBy.CREATED_AT },
    );
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
npx jest find-all-work-orders-paginated.use-case.spec --no-coverage 2>&1 | tail -20
```

Esperado: falha — `sortBy` não está sendo passado ainda.

- [ ] **Step 3: Implementar o default no use case**

Substitua `src/application/use-cases/work-order/find-all-work-orders-paginated.use-case.ts`:

```typescript
import { WorkOrder } from '@domain/entities/work-order.entity';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IFindAllWorkOrdersPaginatedUseCase } from '@domain/interfaces/use-cases/work-order/find-all-work-orders-paginated.use-case.interface';
import { FindAllWorkOrdersFilters } from '@domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';
import { WorkOrderSortBy } from '@domain/enums/work-order-sort-by.enum';

export class FindAllWorkOrdersPaginatedUseCase implements IFindAllWorkOrdersPaginatedUseCase {
  constructor(private readonly workOrderRepository: IWorkOrderRepository) {}

  async execute(input: FindAllWorkOrdersFilters): Promise<PaginatedResult<WorkOrder>> {
    const { page, limit, sortBy: sortByInput, ...filters } = input;
    const pagination: PaginationInput = { page, limit };
    const sortBy = sortByInput ?? WorkOrderSortBy.STATUS_PRIORITY;

    const result = await this.workOrderRepository.findAllPaginated(pagination, {
      ...filters,
      sortBy,
    });

    return buildPaginatedResult(result, pagination);
  }
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
npx jest find-all-work-orders-paginated.use-case.spec --no-coverage 2>&1 | tail -10
```

Esperado: 4/4 PASS.

- [ ] **Step 5: Commit**

```bash
git add \
  src/application/use-cases/work-order/find-all-work-orders-paginated.use-case.ts \
  test/unit/application/use-cases/work-order/find-all-work-orders-paginated.use-case.spec.ts
git commit -m "feat(use-case): aplicar sortBy com default STATUS_PRIORITY na listagem de OS"
```

---

## Task 3: Presentation — adicionar sortBy ao DTO de query

**Files:**
- Modify: `src/presentation/work-order/dto/filter-work-orders.dto.ts`

Não há testes unitários de DTO de validação neste projeto — a validação é coberta pelos testes de integração/e2e.

- [ ] **Step 1: Adicionar sortBy ao FilterWorkOrdersDto**

Substitua `src/presentation/work-order/dto/filter-work-orders.dto.ts`:

```typescript
import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { WorkOrderSortBy } from '@domain/enums/work-order-sort-by.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FilterWorkOrdersDto {
  @ApiPropertyOptional({ description: 'Filtrar por número da OS', example: '000001' })
  @IsOptional()
  @IsString({ message: 'O número da OS deve ser um texto.' })
  number?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID do cliente', format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID do cliente deve ser um UUID válido.' })
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID do veículo', format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID do veículo deve ser um UUID válido.' })
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID do mecânico responsável', format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'O ID do mecânico deve ser um UUID válido.' })
  assignedUserId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por status da OS', enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus, {
    message: `status deve ser um dos seguintes: ${Object.values(WorkOrderStatus).join(', ')}`,
  })
  status?: WorkOrderStatus;

  @ApiPropertyOptional({
    description: 'Critério de ordenação',
    enum: WorkOrderSortBy,
    default: WorkOrderSortBy.STATUS_PRIORITY,
  })
  @IsOptional()
  @IsEnum(WorkOrderSortBy, {
    message: `sortBy deve ser um dos seguintes: ${Object.values(WorkOrderSortBy).join(', ')}`,
  })
  sortBy?: WorkOrderSortBy;
}

export class FindAllWorkOrdersPaginatedQueryDto extends IntersectionType(
  PaginationDto,
  FilterWorkOrdersDto,
) {}
```

- [ ] **Step 2: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Rodar suite completa para garantir sem regressão**

```bash
npx jest --no-coverage 2>&1 | tail -10
```

Esperado: todos passando.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/work-order/dto/filter-work-orders.dto.ts
git commit -m "feat(presentation): expor parâmetro sortBy na query da listagem de OS"
```

---

## Task 4: Repository — implementar sortBy usando constante de domínio

**Files:**
- Modify: `src/infrastructure/repositories/prisma-work-order.repository.ts`
- Test: `test/unit/infrastructure/repositories/prisma-work-order.repository.spec.ts`

- [ ] **Step 1: Escrever os testes que falham**

No arquivo `test/unit/infrastructure/repositories/prisma-work-order.repository.spec.ts`, dentro do `describe('findAllPaginated')`, adicione os seguintes testes **antes** de alterar a implementação:

```typescript
it('should sort by createdAt ASC when sortBy is CREATED_AT', async () => {
  const id1 = randomUUID();
  const id2 = randomUUID();

  // $queryRaw retorna os IDs em ordem de criação
  prisma.$queryRaw.mockResolvedValue([{ id: id1 }, { id: id2 }]);
  prisma.workOrder.count.mockResolvedValue(2);
  prisma.workOrder.findMany.mockResolvedValue([
    { id: id1, number: '000001', status: WorkOrderStatus.RECEIVED, createdAt: new Date('2026-01-01') },
    { id: id2, number: '000002', status: WorkOrderStatus.IN_PROGRESS, createdAt: new Date('2026-01-02') },
  ]);

  const result = await repository.findAllPaginated(
    { page: 1, limit: 10 },
    { sortBy: WorkOrderSortBy.CREATED_AT },
  );

  expect(result.items[0]).toMatchObject({ id: id1 });
  expect(result.items[1]).toMatchObject({ id: id2 });
  expect(prisma.$queryRaw).toHaveBeenCalled();
});

it('should sort by STATUS_PRIORITY by default when sortBy is STATUS_PRIORITY', async () => {
  const idInProgress = randomUUID();
  const idReceived = randomUUID();

  prisma.$queryRaw.mockResolvedValue([{ id: idInProgress }, { id: idReceived }]);
  prisma.workOrder.count.mockResolvedValue(2);
  prisma.workOrder.findMany.mockResolvedValue([
    { id: idReceived, number: '000002', status: WorkOrderStatus.RECEIVED, createdAt: new Date() },
    { id: idInProgress, number: '000001', status: WorkOrderStatus.IN_PROGRESS, createdAt: new Date() },
  ]);

  const result = await repository.findAllPaginated(
    { page: 1, limit: 10 },
    { sortBy: WorkOrderSortBy.STATUS_PRIORITY },
  );

  expect(result.items[0]).toMatchObject({ id: idInProgress });
  expect(result.items[1]).toMatchObject({ id: idReceived });
});
```

Adicione também o import de `WorkOrderSortBy` no topo do arquivo de teste:
```typescript
import { WorkOrderSortBy } from '@domain/enums/work-order-sort-by.enum';
```

- [ ] **Step 2: Rodar para confirmar que falham**

```bash
npx jest prisma-work-order.repository.spec --no-coverage 2>&1 | tail -20
```

Esperado: falha — `WorkOrderSortBy` não está sendo usado no repositório ainda.

- [ ] **Step 3: Implementar a lógica de sortBy no repositório**

Substitua o método `findAllPaginated` em `src/infrastructure/repositories/prisma-work-order.repository.ts`. O arquivo completo do método:

Primeiro, adicione os imports no topo do arquivo (após os imports existentes):

```typescript
import { WorkOrderSortBy } from '@domain/enums/work-order-sort-by.enum';
import { WORK_ORDER_STATUS_PRIORITY } from '@domain/constants/work-order-status-priority.constant';
```

Depois, substitua o método `findAllPaginated` (linhas 80–151 aproximadamente):

```typescript
async findAllPaginated(
  pagination: PaginationInput,
  filters: WorkOrderFilters,
): Promise<PaginatedRepositoryResult<WorkOrder>> {
  const { number, customerId, vehicleId, assignedUserId, status, sortBy } = filters;
  const { page, limit } = pagination;

  const where: Prisma.WorkOrderWhereInput = {};
  if (number) where.number = { contains: number.trim(), mode: 'insensitive' };
  if (customerId) where.customerId = customerId;
  if (vehicleId) where.vehicleId = vehicleId;
  if (assignedUserId) where.assignedUserId = assignedUserId;
  if (status) where.status = status;

  const conditions: Prisma.Sql[] = [];
  // "number" is double-quoted because it is a reserved word in SQL
  if (number) conditions.push(Prisma.sql`"number" ILIKE ${'%' + number.trim() + '%'}`);
  if (customerId) conditions.push(Prisma.sql`customer_id = ${customerId}::uuid`);
  if (vehicleId) conditions.push(Prisma.sql`vehicle_id = ${vehicleId}::uuid`);
  if (assignedUserId) conditions.push(Prisma.sql`assigned_user_id = ${assignedUserId}::uuid`);
  if (status) conditions.push(Prisma.sql`status::text = ${status}`);

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;

  const orderByClause =
    sortBy === WorkOrderSortBy.CREATED_AT
      ? Prisma.sql`created_at ASC`
      : Prisma.sql`CASE status::text ${Prisma.join(
          Object.entries(WORK_ORDER_STATUS_PRIORITY).map(
            ([s, p]) => Prisma.sql`WHEN ${s} THEN ${p}`,
          ),
          ' ',
        )} END, created_at ASC`;

  const offset = (page - 1) * limit;

  const query = Prisma.sql`
    SELECT id FROM work_orders
    ${whereClause}
    ORDER BY ${orderByClause}
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

- [ ] **Step 4: Rodar os testes do repositório**

```bash
npx jest prisma-work-order.repository.spec --no-coverage 2>&1 | tail -20
```

Esperado: todos passando.

- [ ] **Step 5: Rodar a suite completa**

```bash
npx jest --no-coverage 2>&1 | tail -10
```

Esperado: sem regressões.

- [ ] **Step 6: Commit**

```bash
git add \
  src/infrastructure/repositories/prisma-work-order.repository.ts \
  test/unit/infrastructure/repositories/prisma-work-order.repository.spec.ts
git commit -m "feat(repository): implementar sortBy dinâmico usando constante de prioridade de status do domínio"
```

---

## Self-Review

**Spec coverage:**
- ✅ Todos os 9 status com prioridade explícita — `WORK_ORDER_STATUS_PRIORITY` cobre todos
- ✅ Parâmetro `sortBy` no endpoint — `FilterWorkOrdersDto`
- ✅ Default no use case — `sortByInput ?? WorkOrderSortBy.STATUS_PRIORITY`
- ✅ Regra de negócio no domínio — constante em `src/domain/constants/`
- ✅ Repositório desacoplado — lê a constante do domínio, sem hardcode

**Placeholder scan:** nenhum TBD ou TODO.

**Type consistency:**
- `WorkOrderSortBy` — mesmo nome em todos os arquivos
- `WORK_ORDER_STATUS_PRIORITY` — importado do mesmo path em todos os usos
- `sortBy?: WorkOrderSortBy` — campo consistente em `WorkOrderFilters` e `FindAllWorkOrdersFilters`
