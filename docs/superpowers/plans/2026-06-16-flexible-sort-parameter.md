# Flexible Sort Parameter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `sortBy` enum query param with a flexible `sort` string (`status:desc,createdAt:asc`) that supports multiple fields and directions, validated against a domain allowlist.

**Architecture:** A `parseSort` util converts the raw query string to `SortCriterion[]`; `WorkOrder.validateAllowedSortFields` guards allowed fields; the repository receives `sort: SortCriterion[]` and converts it to Prisma's `orderBy` via a `toPrismaOrderBy` helper. The repository is simplified to a single code path using the existing `paginate` helper.

**Tech Stack:** NestJS, Prisma ORM, TypeScript, Jest

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/domain/enums/sort-direction.enum.ts` | `SortDirection` enum (ASC/DESC) |
| Create | `src/domain/interfaces/common/sort-criterion.ts` | `SortCriterion` class with `field` and `direction` |
| Create | `src/application/utils/parse-sort.util.ts` | Parse raw string `"status:desc,createdAt:asc"` → `SortCriterion[]` |
| Create | `src/infrastructure/database/prisma/helpers/prisma-sort.helper.ts` | Convert `SortCriterion[]` → Prisma `orderBy` array |
| Create | `test/unit/application/utils/parse-sort.util.spec.ts` | Tests for `parseSort` |
| Create | `test/unit/infrastructure/helpers/prisma-sort.helper.spec.ts` | Tests for `toPrismaOrderBy` |
| Modify | `src/domain/entities/work-order.entity.ts` | Add `ALLOWED_SORT_FIELDS` + `validateAllowedSortFields` static method |
| Modify | `src/domain/interfaces/repositories/work-order.repository.interface.ts` | `sortBy?: WorkOrderSortBy` → `sort?: SortCriterion[]` |
| Modify | `src/domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto.ts` | `sortBy?: WorkOrderSortBy` → `sort?: string` |
| Modify | `src/presentation/work-order/dto/filter-work-orders.dto.ts` | `sortBy` field → `sort` string with `@IsString()` |
| Modify | `src/application/use-cases/work-order/find-all-work-orders-paginated.use-case.ts` | Parse → default → validate → pass `sort` to repo |
| Modify | `src/infrastructure/repositories/prisma-work-order.repository.ts` | Single `paginate` path using `toPrismaOrderBy` |
| Modify | `test/unit/application/use-cases/work-order/find-all-work-orders-paginated.use-case.spec.ts` | Update for new interface |
| Modify | `test/unit/infrastructure/repositories/prisma-work-order.repository.spec.ts` | Update for `sort: SortCriterion[]` |
| Modify | `test/unit/presentation/work-order/work-order.controller.spec.ts` | Update for `sort` string param |
| Modify | `test/e2e/work-order.e2e-spec.ts` | Update for `?sort=status:desc` format |
| Delete | `src/domain/enums/work-order-sort-by.enum.ts` | Replaced by `SortCriterion` |
| Delete | `src/domain/constants/work-order-status-priority.constant.ts` | No longer used |

---

### Task 1: Domain primitives — `SortDirection` e `SortCriterion`

**Files:**
- Create: `src/domain/enums/sort-direction.enum.ts`
- Create: `src/domain/interfaces/common/sort-criterion.ts`

- [ ] **Step 1: Criar `SortDirection` enum**

```typescript
// src/domain/enums/sort-direction.enum.ts
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}
```

- [ ] **Step 2: Criar `SortCriterion` class**

```typescript
// src/domain/interfaces/common/sort-criterion.ts
import { SortDirection } from '@domain/enums/sort-direction.enum';

export class SortCriterion {
  constructor(
    readonly field: string,
    readonly direction: SortDirection,
  ) {}
}
```

- [ ] **Step 3: Commit**

```bash
git add src/domain/enums/sort-direction.enum.ts src/domain/interfaces/common/sort-criterion.ts
git commit -m "feat(domain): adicionar SortDirection enum e SortCriterion class"
```

---

### Task 2: `parseSort` util

**Files:**
- Create: `src/application/utils/parse-sort.util.ts`
- Create: `test/unit/application/utils/parse-sort.util.spec.ts`

- [ ] **Step 1: Escrever os testes (falharão)**

```typescript
// test/unit/application/utils/parse-sort.util.spec.ts
import { parseSort } from '@application/utils/parse-sort.util';
import { SortDirection } from '@domain/enums/sort-direction.enum';

describe('parseSort', () => {
  it('should return empty array for undefined input', () => {
    expect(parseSort(undefined)).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    expect(parseSort('')).toEqual([]);
    expect(parseSort('   ')).toEqual([]);
  });

  it('should parse single criterion', () => {
    const result = parseSort('status:desc');
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('status');
    expect(result[0].direction).toBe(SortDirection.DESC);
  });

  it('should parse multiple criteria', () => {
    const result = parseSort('status:desc,createdAt:asc');
    expect(result).toHaveLength(2);
    expect(result[0].field).toBe('status');
    expect(result[0].direction).toBe(SortDirection.DESC);
    expect(result[1].field).toBe('createdAt');
    expect(result[1].direction).toBe(SortDirection.ASC);
  });

  it('should default direction to asc when omitted', () => {
    const result = parseSort('createdAt');
    expect(result[0].direction).toBe(SortDirection.ASC);
  });

  it('should be case-insensitive for direction', () => {
    const result = parseSort('status:DESC');
    expect(result[0].direction).toBe(SortDirection.DESC);
  });

  it('should trim whitespace around parts', () => {
    const result = parseSort(' status : desc , createdAt : asc ');
    expect(result).toHaveLength(2);
    expect(result[0].field).toBe('status');
    expect(result[1].field).toBe('createdAt');
  });

  it('should throw DomainValidationException for invalid direction', () => {
    const { DomainValidationException } = require('@domain/exceptions/domain-validation.exception');
    expect(() => parseSort('status:invalid')).toThrow(DomainValidationException);
  });

  it('should throw DomainValidationException for empty field', () => {
    const { DomainValidationException } = require('@domain/exceptions/domain-validation.exception');
    expect(() => parseSort(':desc')).toThrow(DomainValidationException);
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npm test -- --testPathPatterns="parse-sort.util.spec"
```
Esperado: `FAIL — parseSort is not a function`

- [ ] **Step 3: Implementar `parseSort`**

```typescript
// src/application/utils/parse-sort.util.ts
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

      if (direction !== 'asc' && direction !== 'desc') {
        throw new DomainValidationException(
          `Formato de ordenação inválido: direção '${rawDir}' não permitida. Use 'asc' ou 'desc'.`,
        );
      }

      return new SortCriterion(
        field,
        direction === 'asc' ? SortDirection.ASC : SortDirection.DESC,
      );
    });
}
```

- [ ] **Step 4: Rodar para confirmar aprovação**

```bash
npm test -- --testPathPatterns="parse-sort.util.spec"
```
Esperado: `9 passed`

- [ ] **Step 5: Commit**

```bash
git add src/application/utils/parse-sort.util.ts test/unit/application/utils/parse-sort.util.spec.ts
git commit -m "feat(application): adicionar utilitário parseSort"
```

---

### Task 3: `toPrismaOrderBy` helper

**Files:**
- Create: `src/infrastructure/database/prisma/helpers/prisma-sort.helper.ts`
- Create: `test/unit/infrastructure/helpers/prisma-sort.helper.spec.ts`

- [ ] **Step 1: Escrever os testes (falharão)**

```typescript
// test/unit/infrastructure/helpers/prisma-sort.helper.spec.ts
import { toPrismaOrderBy } from '@infrastructure/database/prisma/helpers/prisma-sort.helper';
import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';

describe('toPrismaOrderBy', () => {
  it('should convert single criterion to prisma orderBy', () => {
    const criteria = [new SortCriterion('status', SortDirection.DESC)];
    expect(toPrismaOrderBy(criteria)).toEqual([{ status: 'desc' }]);
  });

  it('should convert multiple criteria', () => {
    const criteria = [
      new SortCriterion('status', SortDirection.DESC),
      new SortCriterion('createdAt', SortDirection.ASC),
    ];
    expect(toPrismaOrderBy(criteria)).toEqual([{ status: 'desc' }, { createdAt: 'asc' }]);
  });

  it('should return empty array for empty input', () => {
    expect(toPrismaOrderBy([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npm test -- --testPathPatterns="prisma-sort.helper.spec"
```
Esperado: `FAIL — toPrismaOrderBy is not a function`

- [ ] **Step 3: Implementar helper**

```typescript
// src/infrastructure/database/prisma/helpers/prisma-sort.helper.ts
import { SortCriterion } from '@domain/interfaces/common/sort-criterion';

export function toPrismaOrderBy(criteria: SortCriterion[]): Record<string, string>[] {
  return criteria.map((c) => ({ [c.field]: c.direction }));
}
```

- [ ] **Step 4: Rodar para confirmar aprovação**

```bash
npm test -- --testPathPatterns="prisma-sort.helper.spec"
```
Esperado: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/database/prisma/helpers/prisma-sort.helper.ts test/unit/infrastructure/helpers/prisma-sort.helper.spec.ts
git commit -m "feat(infrastructure): adicionar helper toPrismaOrderBy"
```

---

### Task 4: `WorkOrder.validateAllowedSortFields`

**Files:**
- Modify: `src/domain/entities/work-order.entity.ts`
- Modify (ou criar): test do entity ou arquivo específico

- [ ] **Step 1: Localizar onde adicionar no entity**

O método vai como `static` na classe `WorkOrder`. Encontrar o fim da classe ou após os métodos `create`/`reconstitute`.

- [ ] **Step 2: Escrever teste na suite existente do entity**

Adicionar ao final do bloco `describe('WorkOrder')` existente em `test/unit/domain/entities/work-order.entity.spec.ts` (ou criar o bloco se não existir):

```typescript
describe('validateAllowedSortFields', () => {
  it('should not throw for allowed fields', () => {
    expect(() => WorkOrder.validateAllowedSortFields(['status', 'createdAt'])).not.toThrow();
  });

  it('should not throw for a single allowed field', () => {
    expect(() => WorkOrder.validateAllowedSortFields(['status'])).not.toThrow();
  });

  it('should throw DomainValidationException for unknown field', () => {
    expect(() => WorkOrder.validateAllowedSortFields(['number'])).toThrow(
      DomainValidationException,
    );
  });

  it('should throw with the unknown field name in the message', () => {
    expect(() => WorkOrder.validateAllowedSortFields(['number'])).toThrow(
      /number/,
    );
  });

  it('should throw on the first invalid field', () => {
    expect(() => WorkOrder.validateAllowedSortFields(['status', 'number'])).toThrow(
      DomainValidationException,
    );
  });
});
```

- [ ] **Step 3: Rodar para confirmar falha**

```bash
npm test -- --testPathPatterns="work-order.entity.spec"
```
Esperado: `FAIL — WorkOrder.validateAllowedSortFields is not a function`

- [ ] **Step 4: Adicionar à entidade**

Após os imports existentes e antes da classe `WorkOrder`, adicionar a constante, depois dentro da classe o método estático:

```typescript
// dentro de src/domain/entities/work-order.entity.ts
// adicionar DENTRO da classe WorkOrder, após os campos readonly

private static readonly ALLOWED_SORT_FIELDS = new Set(['status', 'createdAt']);

static validateAllowedSortFields(fields: string[]): void {
  for (const field of fields) {
    if (!WorkOrder.ALLOWED_SORT_FIELDS.has(field)) {
      throw new DomainValidationException(
        `Campo '${field}' não é permitido para ordenação. Campos permitidos: ${[...WorkOrder.ALLOWED_SORT_FIELDS].join(', ')}`,
      );
    }
  }
}
```

- [ ] **Step 5: Rodar para confirmar aprovação**

```bash
npm test -- --testPathPatterns="work-order.entity.spec"
```
Esperado: todos passando

- [ ] **Step 6: Commit**

```bash
git add src/domain/entities/work-order.entity.ts test/unit/domain/entities/work-order.entity.spec.ts
git commit -m "feat(domain): adicionar validateAllowedSortFields na entidade WorkOrder"
```

---

### Task 5: Atualizar interfaces (repository e use-case DTO)

**Files:**
- Modify: `src/domain/interfaces/repositories/work-order.repository.interface.ts`
- Modify: `src/domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto.ts`

- [ ] **Step 1: Atualizar `WorkOrderFilters` no repository interface**

```typescript
// src/domain/interfaces/repositories/work-order.repository.interface.ts
import { WorkOrder } from '../../entities/work-order.entity';
import { WorkOrderService } from '../../entities/work-order-service.entity';
import { WorkOrderPartSupply } from '../../entities/work-order-part-supply.entity';
import { WorkOrderStatus } from '../../enums/work-order-status.enum';
import { SortCriterion } from '../common/sort-criterion';
import { PaginatedRepositoryResult, PaginationInput } from '../common/pagination.interface';

export interface WorkOrderFilters {
  number?: string;
  customerId?: string;
  vehicleId?: string;
  assignedUserId?: string;
  status?: WorkOrderStatus;
  sort?: SortCriterion[];
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

- [ ] **Step 2: Atualizar `FindAllWorkOrdersFilters` no use-case DTO**

```typescript
// src/domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto.ts
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export interface FindAllWorkOrdersFilters extends PaginationInput {
  number?: string;
  customerId?: string;
  vehicleId?: string;
  assignedUserId?: string;
  status?: WorkOrderStatus;
  sort?: string;
}
```

- [ ] **Step 3: Verificar compilação**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Erros esperados: repositório e use-case ainda não atualizados.

- [ ] **Step 4: Commit**

```bash
git add src/domain/interfaces/repositories/work-order.repository.interface.ts \
        src/domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto.ts
git commit -m "refactor(domain): trocar sortBy por sort nas interfaces de WorkOrder"
```

---

### Task 6: Atualizar presentation DTO

**Files:**
- Modify: `src/presentation/work-order/dto/filter-work-orders.dto.ts`

- [ ] **Step 1: Substituir campo `sortBy` por `sort`**

```typescript
// src/presentation/work-order/dto/filter-work-orders.dto.ts
import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
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
    description: 'Critérios de ordenação no formato campo:direção separados por vírgula. Ex: status:desc,createdAt:asc. Campos permitidos: status, createdAt. Padrão: status:desc,createdAt:asc',
    example: 'status:desc,createdAt:asc',
  })
  @IsOptional()
  @IsString({ message: 'O parâmetro sort deve ser uma string.' })
  sort?: string;
}

export class FindAllWorkOrdersPaginatedQueryDto extends IntersectionType(
  PaginationDto,
  FilterWorkOrdersDto,
) {}
```

- [ ] **Step 2: Commit**

```bash
git add src/presentation/work-order/dto/filter-work-orders.dto.ts
git commit -m "refactor(presentation): trocar sortBy por sort string na query da listagem de OS"
```

---

### Task 7: Refatorar use-case

**Files:**
- Modify: `src/application/use-cases/work-order/find-all-work-orders-paginated.use-case.ts`
- Modify: `test/unit/application/use-cases/work-order/find-all-work-orders-paginated.use-case.spec.ts`

- [ ] **Step 1: Atualizar os testes do use-case**

```typescript
// test/unit/application/use-cases/work-order/find-all-work-orders-paginated.use-case.spec.ts
import { FindAllWorkOrdersPaginatedUseCase } from '@application/use-cases/work-order/find-all-work-orders-paginated.use-case';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import {
  createMockWorkOrder,
  createMockWorkOrderRepository,
} from '../../../../helpers/work-order-mock.factory';

describe('FindAllWorkOrdersPaginatedUseCase', () => {
  let useCase: FindAllWorkOrdersPaginatedUseCase;
  let workOrderRepository: jest.Mocked<IWorkOrderRepository>;

  const DEFAULT_SORT = [
    new SortCriterion('status', SortDirection.DESC),
    new SortCriterion('createdAt', SortDirection.ASC),
  ];

  beforeEach(() => {
    workOrderRepository = createMockWorkOrderRepository();
    useCase = new FindAllWorkOrdersPaginatedUseCase(workOrderRepository);
  });

  it('should return paginated work orders', async () => {
    const wo = createMockWorkOrder();
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [wo], total: 1 });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.totalRecords).toBe(1);
    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { sort: DEFAULT_SORT },
    );
  });

  it('should apply default sort when sort is not provided', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, limit: 10 });

    const call = workOrderRepository.findAllPaginated.mock.calls[0][1];
    expect(call.sort).toEqual(DEFAULT_SORT);
  });

  it('should parse and forward explicit sort param', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 1, limit: 10, sort: 'createdAt:asc' });

    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { sort: [new SortCriterion('createdAt', SortDirection.ASC)] },
    );
  });

  it('should pass filters alongside sort', async () => {
    workOrderRepository.findAllPaginated.mockResolvedValue({ items: [], total: 0 });

    await useCase.execute({ page: 2, limit: 5, customerId: 'cust-1' });

    expect(workOrderRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 2, limit: 5 },
      { customerId: 'cust-1', sort: DEFAULT_SORT },
    );
  });

  it('should throw DomainValidationException for disallowed sort field', async () => {
    await expect(
      useCase.execute({ page: 1, limit: 10, sort: 'number:asc' }),
    ).rejects.toThrow(DomainValidationException);
  });

  it('should throw DomainValidationException for invalid sort format', async () => {
    await expect(
      useCase.execute({ page: 1, limit: 10, sort: 'status:invalid' }),
    ).rejects.toThrow(DomainValidationException);
  });
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npm test -- --testPathPatterns="find-all-work-orders-paginated.use-case.spec"
```
Esperado: `FAIL`

- [ ] **Step 3: Implementar use-case atualizado**

```typescript
// src/application/use-cases/work-order/find-all-work-orders-paginated.use-case.ts
import { WorkOrder } from '@domain/entities/work-order.entity';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IFindAllWorkOrdersPaginatedUseCase } from '@domain/interfaces/use-cases/work-order/find-all-work-orders-paginated.use-case.interface';
import { FindAllWorkOrdersFilters } from '@domain/interfaces/use-cases/work-order/dto/find-all-work-orders.dto';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';
import { parseSort } from '@application/utils/parse-sort.util';
import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';

const DEFAULT_SORT: SortCriterion[] = [
  new SortCriterion('status', SortDirection.DESC),
  new SortCriterion('createdAt', SortDirection.ASC),
];

export class FindAllWorkOrdersPaginatedUseCase implements IFindAllWorkOrdersPaginatedUseCase {
  constructor(private readonly workOrderRepository: IWorkOrderRepository) {}

  async execute(input: FindAllWorkOrdersFilters): Promise<PaginatedResult<WorkOrder>> {
    const { page, limit, sort: rawSort, ...filters } = input;
    const pagination: PaginationInput = { page, limit };

    const criteria = parseSort(rawSort);
    const sort = criteria.length > 0 ? criteria : DEFAULT_SORT;

    WorkOrder.validateAllowedSortFields(sort.map((c) => c.field));

    const result = await this.workOrderRepository.findAllPaginated(pagination, {
      ...filters,
      sort,
    });

    return buildPaginatedResult(result, pagination);
  }
}
```

- [ ] **Step 4: Rodar para confirmar aprovação**

```bash
npm test -- --testPathPatterns="find-all-work-orders-paginated.use-case.spec"
```
Esperado: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/work-order/find-all-work-orders-paginated.use-case.ts \
        test/unit/application/use-cases/work-order/find-all-work-orders-paginated.use-case.spec.ts
git commit -m "refactor(use-case): substituir sortBy por sort com parseSort e validateAllowedSortFields"
```

---

### Task 8: Refatorar repositório

**Files:**
- Modify: `src/infrastructure/repositories/prisma-work-order.repository.ts`
- Modify: `test/unit/infrastructure/repositories/prisma-work-order.repository.spec.ts`

- [ ] **Step 1: Atualizar testes do repositório**

Substituir o bloco `describe('findAllPaginated')` por:

```typescript
describe('findAllPaginated', () => {
  it('should use findMany and count via paginate helper', async () => {
    prisma.workOrder.findMany.mockResolvedValue([]);
    prisma.workOrder.count.mockResolvedValue(0);

    const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(prisma.workOrder.findMany).toHaveBeenCalled();
    expect(prisma.workOrder.count).toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('should pass where filters to findMany and count', async () => {
    const customerId = randomUUID();
    prisma.workOrder.findMany.mockResolvedValue([]);
    prisma.workOrder.count.mockResolvedValue(0);

    await repository.findAllPaginated(
      { page: 1, limit: 10 },
      { customerId },
    );

    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customerId }),
      }),
    );
    expect(prisma.workOrder.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ customerId }) }),
    );
  });

  it('should pass orderBy from SortCriterion[] to findMany', async () => {
    prisma.workOrder.findMany.mockResolvedValue([]);
    prisma.workOrder.count.mockResolvedValue(0);

    const sort = [
      new SortCriterion('status', SortDirection.DESC),
      new SortCriterion('createdAt', SortDirection.ASC),
    ];

    await repository.findAllPaginated({ page: 1, limit: 10 }, { sort });

    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ status: 'desc' }, { createdAt: 'asc' }],
      }),
    );
  });

  it('should apply pagination skip and take', async () => {
    prisma.workOrder.findMany.mockResolvedValue([]);
    prisma.workOrder.count.mockResolvedValue(0);

    await repository.findAllPaginated({ page: 3, limit: 5 }, {});

    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 }),
    );
  });

  it('should return mapped domain items', async () => {
    const id1 = randomUUID();
    const id2 = randomUUID();
    prisma.workOrder.findMany.mockResolvedValue([
      { id: id1, number: '000001', status: WorkOrderStatus.IN_PROGRESS, createdAt: new Date() },
      { id: id2, number: '000002', status: WorkOrderStatus.RECEIVED, createdAt: new Date() },
    ]);
    prisma.workOrder.count.mockResolvedValue(2);

    const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

    expect(result.total).toBe(2);
    expect(result.items[0]).toMatchObject({ id: id1 });
    expect(result.items[1]).toMatchObject({ id: id2 });
  });
});
```

Também adicionar os imports necessários no topo do arquivo spec:
```typescript
import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npm test -- --testPathPatterns="prisma-work-order.repository.spec"
```
Esperado: testes falhando por incompatibilidade de interface

- [ ] **Step 3: Atualizar implementação do repositório**

```typescript
// src/infrastructure/repositories/prisma-work-order.repository.ts
// Substituir findAllPaginated por:

async findAllPaginated(
  pagination: PaginationInput,
  filters: WorkOrderFilters,
): Promise<PaginatedRepositoryResult<WorkOrder>> {
  const { number, customerId, vehicleId, assignedUserId, status, sort } = filters;

  const where: Prisma.WorkOrderWhereInput = {};
  if (number) where.number = { contains: number.trim(), mode: 'insensitive' };
  if (customerId) where.customerId = customerId;
  if (vehicleId) where.vehicleId = vehicleId;
  if (assignedUserId) where.assignedUserId = assignedUserId;
  if (status) where.status = status;

  const orderBy = sort?.length ? toPrismaOrderBy(sort) : undefined;

  const result = await paginate(
    this.prisma.workOrder,
    { where, ...(orderBy && { orderBy }), include: WORK_ORDER_LIST_INCLUDE },
    pagination,
  );

  return {
    items: result.items.map((r) =>
      WorkOrderMapper.toDomain(r as Parameters<typeof WorkOrderMapper.toDomain>[0]),
    ),
    total: result.total,
  };
}
```

Atualizar imports no topo do arquivo:
- Remover: `import { WorkOrderSortBy } from '@domain/enums/work-order-sort-by.enum';`
- Remover: `import { WORK_ORDER_STATUS_PRIORITY } from '@domain/constants/work-order-status-priority.constant';`
- Adicionar: `import { toPrismaOrderBy } from '@infrastructure/database/prisma/helpers/prisma-sort.helper';`

- [ ] **Step 4: Rodar para confirmar aprovação**

```bash
npm test -- --testPathPatterns="prisma-work-order.repository.spec"
```
Esperado: todos passando

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/repositories/prisma-work-order.repository.ts \
        test/unit/infrastructure/repositories/prisma-work-order.repository.spec.ts
git commit -m "refactor(repository): usar paginate com toPrismaOrderBy, remover raw SQL restante"
```

---

### Task 9: Atualizar teste do controller

**Files:**
- Modify: `test/unit/presentation/work-order/work-order.controller.spec.ts`

- [ ] **Step 1: Substituir referência a `WorkOrderSortBy` por `sort` string**

Localizar o teste `should forward sortBy to use case` e atualizar:

```typescript
it('should forward sort to use case', async () => {
  findAllWorkOrdersPaginatedUseCase.execute.mockResolvedValue({
    items: [],
    pagination: { page: 1, limit: 10, totalRecords: 0, totalPages: 0 },
  });

  await controller.findAll({ page: 1, limit: 10, sort: 'createdAt:asc' });

  expect(findAllWorkOrdersPaginatedUseCase.execute).toHaveBeenCalledWith(
    expect.objectContaining({ sort: 'createdAt:asc' }),
  );
});
```

Remover o import de `WorkOrderSortBy` do arquivo spec.

- [ ] **Step 2: Rodar**

```bash
npm test -- --testPathPatterns="work-order.controller.spec"
```
Esperado: todos passando

- [ ] **Step 3: Commit**

```bash
git add test/unit/presentation/work-order/work-order.controller.spec.ts
git commit -m "test(controller): atualizar spec para parâmetro sort string"
```

---

### Task 10: Atualizar testes e2e

**Files:**
- Modify: `test/e2e/work-order.e2e-spec.ts`

- [ ] **Step 1: Localizar e substituir testes do GET /api/work-orders**

Localizar o bloco `describe('GET /api/work-orders')` e substituir os testes de `sortBy`:

```typescript
it('should accept sort=status:desc and return 200', async () => {
  // ... mesmo setup de autenticação que os testes vizinhos ...
  const response = await request(httpServer)
    .get('/api/work-orders?sort=status:desc')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(response.body).toHaveProperty('items');
});

it('should accept sort=createdAt:asc and return 200', async () => {
  const response = await request(httpServer)
    .get('/api/work-orders?sort=createdAt:asc')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(response.body).toHaveProperty('items');
});

it('should accept sort=status:desc,createdAt:asc and return 200', async () => {
  const response = await request(httpServer)
    .get('/api/work-orders?sort=status:desc,createdAt:asc')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(response.body).toHaveProperty('items');
});

it('should return 422 for disallowed sort field', async () => {
  await request(httpServer)
    .get('/api/work-orders?sort=number:asc')
    .set('Authorization', `Bearer ${token}`)
    .expect(422);
});

it('should return 422 for invalid sort direction', async () => {
  await request(httpServer)
    .get('/api/work-orders?sort=status:invalid')
    .set('Authorization', `Bearer ${token}`)
    .expect(422);
});
```

> **Nota:** copiar o padrão exato de autenticação/setup dos testes vizinhos no bloco `describe('GET /api/work-orders')` (token, beforeEach, etc.).

- [ ] **Step 2: Rodar testes e2e**

```bash
npm run test:e2e -- --testPathPatterns="work-order.e2e-spec"
```
Esperado: todos passando

- [ ] **Step 3: Commit**

```bash
git add test/e2e/work-order.e2e-spec.ts
git commit -m "test(e2e): atualizar testes de ordenação para formato sort=campo:direção"
```

---

### Task 11: Cleanup — remover arquivos obsoletos

**Files:**
- Delete: `src/domain/enums/work-order-sort-by.enum.ts`
- Delete: `src/domain/constants/work-order-status-priority.constant.ts`

- [ ] **Step 1: Verificar que nenhum arquivo ainda importa os artefatos antigos**

```bash
grep -rn "work-order-sort-by\|WorkOrderSortBy\|WORK_ORDER_STATUS_PRIORITY\|work-order-status-priority" \
  src/ test/ --include="*.ts" | grep -v "node_modules\|dist"
```
Esperado: sem resultados.

- [ ] **Step 2: Deletar arquivos**

```bash
rm src/domain/enums/work-order-sort-by.enum.ts
rm src/domain/constants/work-order-status-priority.constant.ts
```

- [ ] **Step 3: Rodar suite completa**

```bash
npm test 2>&1 | tail -10
```
Esperado: `X passed, 0 failed`

- [ ] **Step 4: Commit final**

```bash
git add -u
git commit -m "chore: remover WorkOrderSortBy enum e WORK_ORDER_STATUS_PRIORITY após migração para sort string"
```

---

## Notas de Implementação

**Ordenação por `status` via Prisma nativo:** O Prisma usa a ordem de declaração do enum no `schema.prisma` para `ORDER BY status DESC`. Com os status filtrados (sem CANCELLED/COMPLETED/DELIVERED), a ordem DESC resulta em: IN_PROGRESS → REJECTED → APPROVED → AWAITING_APPROVAL → IN_DIAGNOSIS → RECEIVED. A posição de REJECTED e APPROVED está invertida em relação à prioridade original, pois REJECTED (posição 5 no schema) precede APPROVED (posição 4). Se a ordem exata for crítica, a solução correta é reordenar o enum no `schema.prisma` e gerar uma migration — escopo fora desta tarefa.

**`DomainValidationException` retorna HTTP 422:** validação de campos inválidos (campo não permitido, direção inválida) resultará em 422 Unprocessable Entity conforme o filtro `DomainExceptionFilter` existente.
