# User como Identidade Única via UserCustomerAccess — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a arquitetura de autenticação separada do `Customer` (branch `feature/customer-login`) por um modelo onde `User` é a única identidade autenticável (ganha a role `CUSTOMER`), `Customer` volta a ser só entidade de negócio, e uma tabela `UserCustomerAccess` (N:N, `SELF | REPRESENTATIVE`) resolve quais clientes cada usuário pode consultar.

**Architecture:** Remove por completo o domínio de auth dedicado a `Customer` (guard, strategy, secrets, use cases, controller). Adiciona `CUSTOMER` ao enum `UserRole` existente, uma tabela de vínculo N:N, e libera `GET /work-orders`/`GET /work-orders/:id` para essa role, resolvendo o escopo de `customerId` sempre a partir do vínculo (nunca da query string). Decisão de orçamento continua exclusivamente pelo link de e-mail já existente.

**Tech Stack:** NestJS 11, Prisma 7, PostgreSQL, Jest, Supertest, class-validator.

## Global Constraints

- `User` ganha o valor `CUSTOMER` no enum `UserRole`. Nenhum campo novo de documento é criado em `User` — reaproveita o campo `document` já existente (`app/src/domain/entities/user.entity.ts`).
- `Customer` perde `passwordHash` e qualquer capacidade de autenticação. Continua com `name`, `document`, `type`, `email`, `phone`, `address`.
- Nova tabela `UserCustomerAccess`: `id`, `userId`, `customerId`, `relationship: AccessRelationship (SELF | REPRESENTATIVE)`, `createdAt`. `@@unique([userId, customerId])`.
- Para `relationship: SELF`, `User.document` deve ser igual a `Customer.document` — validado na criação do vínculo (não na entidade, é regra cross-aggregate de use case). Para `REPRESENTATIVE`, não há essa exigência.
- Cliente PJ nunca loga diretamente — só é acessado via um `User` PF vinculado como `REPRESENTATIVE`.
- Login continua exclusivamente `POST /auth/login` (`identifier` = e-mail ou documento). Não existe endpoint de login dedicado a cliente.
- `POST /customers` não gera senha nem envia e-mail de acesso — só cria o registro de negócio.
- Provisionamento de acesso é sempre uma ação explícita do admin (`POST /users` com `role: CUSTOMER`, depois `POST /customers/:id/access`) — nunca automático.
- `GET /work-orders` e `GET /work-orders/:id` passam a aceitar `role: CUSTOMER`. O escopo de `customerId` é sempre resolvido a partir de `UserCustomerAccess` (nunca do parâmetro `?customerId=` da query, que é ignorado para essa role).
- `GET /work-orders/:id` retorna **404** (não 401/403) quando a OS existe mas está fora do escopo do `CUSTOMER` que chamou.
- Nenhum outro endpoint aceita `CUSTOMER` além desses dois.
- Decisão de orçamento (aprovar/rejeitar) continua exclusivamente pelo fluxo de e-mail já existente (`GET /quotes/:id/decisions?token=`). Não há endpoint autenticado de decisão de orçamento para cliente.
- Nenhuma tabela `NaturalPerson` é criada agora — `User.document` e `Customer.document` coexistem como campos independentes.
- Toda a infraestrutura de autenticação dedicada a `Customer` da feature anterior é removida (ver Task 8 para a lista completa).

---

## File Structure

**Novos arquivos:**
- `app/prisma/migrations/20260825120000_user_customer_access/migration.sql`
- `app/src/domain/enums/access-relationship.enum.ts`
- `app/src/domain/entities/user-customer-access.entity.ts`
- `app/src/domain/interfaces/repositories/user-customer-access.repository.interface.ts`
- `app/src/infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository.ts`
- `app/src/infrastructure/persistence/prisma/mappers/user-customer-access.mapper.ts`
- `app/src/application/ports/input/customer/dto/create-user-customer-access.dto.ts`
- `app/src/application/ports/input/customer/create-user-customer-access.use-case.interface.ts`
- `app/src/application/use-cases/customer/create-user-customer-access.use-case.ts`
- `app/src/application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case.ts`
- `app/src/infrastructure/http/controllers/customer/dto/requests/create-user-customer-access-request.dto.ts`
- `app/src/infrastructure/http/controllers/customer/dto/responses/user-customer-access-response.dto.ts`
- `app/src/interface-adapters/customer/requests/create-user-customer-access-request.ts`
- `app/src/interface-adapters/customer/responses/user-customer-access.response.ts`
- `app/src/application/ports/input/work-order/find-accessible-customer-ids-for-user.use-case.interface.ts`
- `app/prisma/seeds/user-customer-access.seed.ts`
- `app/test/e2e/user-customer-access.e2e-spec.ts`
- Specs correspondentes a cada arquivo acima (unit) + specs e2e novas (Task 10).

**Arquivos modificados:** `schema.prisma`, `customer.entity.ts`, `customer.mapper.ts`, `prisma-customer.repository.ts`, `create-customer.use-case.ts`, `customer.controller.ts` (HTTP + clean), `customer.module.ts`, `repositories.module.ts`, `work-order.repository.interface.ts`, `find-all-work-orders.dto.ts`, `find-work-order-by-id.use-case.ts`, `prisma-work-order.repository.ts`, `work-order.controller.ts` (HTTP + clean), `find-all-work-orders-query.ts`, `work-order.module.ts`, `token.service.interface.ts`, `auth.controller.ts` (HTTP + clean), `auth.module.ts`, `quote.module.ts`, `user.seed.ts`, `customer.seed.ts`, `seed.ts`, `.env.example`, `docker-compose.yml`, `swagger.config.ts`, `test-app.helper.ts`, `auth.helper.ts`, `collections/oficina-collection.json`, `collections/oficina-environment.json`.

**Arquivos removidos:** ver Task 8.

---

### Task 1: Migration + Prisma schema

**Files:**
- Modify: `app/prisma/schema.prisma`
- Create: `app/prisma/migrations/20260825120000_user_customer_access/migration.sql`

**Interfaces:**
- Produces: enum `UserRole` com valor `CUSTOMER`; enum `AccessRelationship { SELF, REPRESENTATIVE }`; modelo `UserCustomerAccess` com colunas `id, userId (user_id), customerId (customer_id), relationship, createdAt (created_at)`, `@@unique([userId, customerId])`, relações `user: User`, `customer: Customer`. `Customer` sem `passwordHash`.

- [ ] **Step 1: Editar `app/prisma/schema.prisma`**

Adicionar `CUSTOMER` ao enum `UserRole` (linha ~15-19):

```prisma
enum UserRole {
  ADMIN
  MECHANIC
  ATTENDANT
  CUSTOMER
}
```

Adicionar o novo enum `AccessRelationship` (logo após `enum CustomerType`):

```prisma
enum AccessRelationship {
  SELF
  REPRESENTATIVE
}
```

Remover `passwordHash` do modelo `Customer` e adicionar a relação `customerAccess`:

```prisma
model Customer {
  id         String       @id @default(uuid()) @db.Uuid
  name       String       @db.VarChar(150)
  document   String       @unique @db.VarChar(18)
  type       CustomerType @default(INDIVIDUAL)
  email      String       @unique @db.VarChar(150)
  phone      String       @db.VarChar(20)
  createdAt  DateTime     @default(now()) @map("created_at")
  updatedAt  DateTime     @default(now()) @updatedAt @map("updated_at")

  address        Address?
  vehicles       Vehicle[]
  workOrders     WorkOrder[]
  customerAccess UserCustomerAccess[]

  @@map("customers")
}
```

Adicionar a relação `customerAccess` no modelo `User` (não remove nada dele):

```prisma
model User {
  id           String   @id @default(uuid()) @db.Uuid
  name         String   @db.VarChar(150)
  email        String   @unique @db.VarChar(150)
  document     String   @unique @db.VarChar(14)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  role         UserRole @default(ATTENDANT)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at")

  assignedWorkOrders WorkOrder[]          @relation("AssignedUser")
  statusChanges      StatusHistory[]
  customerAccess     UserCustomerAccess[]

  @@map("users")
}
```

Adicionar o novo modelo `UserCustomerAccess` (após o modelo `Customer`, antes de `Address`):

```prisma
model UserCustomerAccess {
  id           String             @id @default(uuid()) @db.Uuid
  userId       String             @map("user_id") @db.Uuid
  customerId   String             @map("customer_id") @db.Uuid
  relationship AccessRelationship
  createdAt    DateTime           @default(now()) @map("created_at")

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@unique([userId, customerId])
  @@index([customerId])
  @@map("user_customer_access")
}
```

- [ ] **Step 2: Criar a migration manualmente**

Criar o diretório e arquivo `app/prisma/migrations/20260825120000_user_customer_access/migration.sql`:

```sql
/*
  Warnings:

  - You are about to drop the column `password_hash` on the `customers` table. All the data in that column will be lost.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';

-- CreateEnum
CREATE TYPE "AccessRelationship" AS ENUM ('SELF', 'REPRESENTATIVE');

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "password_hash";

-- CreateTable
CREATE TABLE "user_customer_access" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "relationship" "AccessRelationship" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_customer_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_customer_access_user_id_customer_id_key" ON "user_customer_access"("user_id", "customer_id");

-- CreateIndex
CREATE INDEX "user_customer_access_customer_id_idx" ON "user_customer_access"("customer_id");

-- AddForeignKey
ALTER TABLE "user_customer_access" ADD CONSTRAINT "user_customer_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_customer_access" ADD CONSTRAINT "user_customer_access_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Gerar o Prisma Client e validar a migration num banco descartável**

Run:
```bash
cd app
DATABASE_URL="postgresql://prisma:prisma@localhost:5432/prisma?schema=public" npx prisma generate
```
Expected: `✔ Generated Prisma Client`.

Depois, validar a migration de ponta a ponta (não usar o Postgres de desenvolvimento local — subir um container descartável):
```bash
docker run -d --name migration-verify-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=techchallenge -p 15434:5432 postgres:16-alpine
# aguardar até "docker exec migration-verify-pg pg_isready -U postgres" retornar OK
DATABASE_URL="postgresql://postgres:postgres@localhost:15434/techchallenge?schema=public" npx prisma migrate deploy
docker exec migration-verify-pg psql -U postgres -d techchallenge -c "\d customers" # confirmar que password_hash não existe mais
docker exec migration-verify-pg psql -U postgres -d techchallenge -c "\d user_customer_access"
docker rm -f migration-verify-pg
```
Expected: `All migrations have been successfully applied.`; `password_hash` ausente em `\d customers`; `user_customer_access` com as colunas esperadas.

- [ ] **Step 4: Commit**

```bash
git add app/prisma/schema.prisma app/prisma/migrations/20260825120000_user_customer_access/
git commit -m "feat(schema): adicionar CUSTOMER ao UserRole, remover senha de Customer e criar UserCustomerAccess"
```

---

### Task 2: Domain — `Customer` sem senha; entidade `UserCustomerAccess`

**Files:**
- Modify: `app/src/domain/entities/customer.entity.ts`
- Modify: `app/test/unit/domain/entities/customer.entity.spec.ts`
- Create: `app/src/domain/enums/access-relationship.enum.ts`
- Create: `app/src/domain/entities/user-customer-access.entity.ts`
- Create: `app/test/unit/domain/entities/user-customer-access.entity.spec.ts`

**Interfaces:**
- Produces: `Customer.create(props: CreateCustomerProps)` sem `passwordHash`; `AccessRelationship` enum; `UserCustomerAccess.create({ userId, customerId, relationship }): UserCustomerAccess`, campos públicos `id, userId, customerId, relationship, createdAt`.

- [ ] **Step 1: Escrever o teste que falha para `Customer` sem senha**

Editar `app/test/unit/domain/entities/customer.entity.spec.ts` — localizar o bloco `describe('create (factory method)')` (ou equivalente) e trocar as referências a `passwordHash`/`changePassword`/`validatePasswordStrength` pelo formato sem senha. Exemplo do teste principal, substituindo o existente:

```typescript
describe('Customer', () => {
  const validProps = {
    name: 'João da Silva',
    document: '12345678909',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '11999999999',
    address: { street: 'Rua A', city: 'São Paulo', state: 'SP', zipCode: '01310100' },
  };

  it('should create a customer without a password field', () => {
    const customer = Customer.create(validProps);

    expect(customer.name).toBe('João da Silva');
    expect(customer).not.toHaveProperty('passwordHash');
    expect(customer).not.toHaveProperty('changePassword');
  });

  it('should not expose passwordHash in toJSON', () => {
    const customer = Customer.create(validProps);
    expect(JSON.stringify(customer.toJSON())).not.toContain('passwordHash');
  });
});
```

Remova (não apenas comente) qualquer teste antigo que chamava `Customer.validatePasswordStrength(...)` ou `customer.changePassword(...)` — esses membros deixam de existir.

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/domain/entities/customer.entity.spec.ts -v`
Expected: FAIL — `Customer.create` ainda exige `passwordHash` (propriedade obrigatória em `CreateCustomerProps`), ou métodos removidos ainda não existem no teste antigo (typecheck/teste vai falhar até o Step 3).

- [ ] **Step 3: Editar `app/src/domain/entities/customer.entity.ts`**

Reescrever o arquivo removendo tudo relacionado a senha:

```typescript
import { randomUUID } from 'node:crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { CustomerType } from '../enums/customer-type.enum';
import { Address, AddressProps } from '../value-objects/address.vo';
import { Email } from '../value-objects/email.vo';
import { Phone } from '../value-objects/phone.vo';
import { Document } from '../value-objects/document.vo';
import { MIN_NAME_LENGTH, MAX_NAME_LENGTH } from '../constants/validation/customer.constants';

export interface CreateCustomerProps {
  name: string;
  document: string;
  type: CustomerType;
  email: string;
  phone: string;
  address: AddressProps;
}

export interface UpdateCustomerProps {
  name: string;
  document: string;
  type: CustomerType;
  email: string;
  phone: string;
  address: AddressProps;
}

interface CustomerProps {
  id: string;
  name: string;
  document: Document;
  type: CustomerType;
  email: Email;
  phone: Phone;
  address: Address | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Customer {
  readonly id: string;
  name: string;
  document: Document;
  type: CustomerType;
  email: Email;
  phone: Phone;
  address: Address | null;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: CustomerProps) {
    this.id = props.id;
    this.name = props.name;
    this.document = props.document;
    this.type = props.type;
    this.email = props.email;
    this.phone = props.phone;
    this.address = props.address;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: CustomerProps): Customer {
    return new Customer(props);
  }

  static create(props: CreateCustomerProps): Customer {
    Customer.validateName(props.name);

    return new Customer({
      id: randomUUID(),
      name: props.name.trim(),
      document: Document.create(props.document, props.type),
      type: props.type,
      email: Email.create(props.email),
      phone: Phone.create(props.phone),
      address: Address.create(props.address),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  update(props: UpdateCustomerProps): void {
    Customer.validateName(props.name);

    this.name = props.name.trim();
    this.document = Document.create(props.document, props.type);
    this.type = props.type;
    this.email = Email.create(props.email);
    this.phone = Phone.create(props.phone);
    this.address = Address.create(props.address);
    this.updatedAt = new Date();
  }

  toJSON(): CustomerProps {
    return {
      id: this.id,
      name: this.name,
      document: this.document,
      type: this.type,
      email: this.email,
      phone: this.phone,
      address: this.address,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainValidationException('Nome é obrigatório');
    }

    const trimmed = name.trim();

    if (trimmed.length < MIN_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`);
    }

    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`);
    }
  }
}
```

Note: `toJSON()` agora retorna `CustomerProps` completo (não tem mais `passwordHash` para excluir — não há necessidade do `Omit`).

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/domain/entities/customer.entity.spec.ts -v`
Expected: PASS.

- [ ] **Step 5: Escrever o teste que falha para `UserCustomerAccess`**

Criar `app/test/unit/domain/entities/user-customer-access.entity.spec.ts`:

```typescript
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('UserCustomerAccess Entity', () => {
  const validProps = {
    userId: 'user-uuid-1',
    customerId: 'customer-uuid-1',
    relationship: AccessRelationship.SELF,
  };

  it('should create a valid SELF access link', () => {
    const access = UserCustomerAccess.create(validProps);

    expect(access.id).toBeDefined();
    expect(access.userId).toBe('user-uuid-1');
    expect(access.customerId).toBe('customer-uuid-1');
    expect(access.relationship).toBe(AccessRelationship.SELF);
    expect(access.createdAt).toBeInstanceOf(Date);
  });

  it('should create a valid REPRESENTATIVE access link', () => {
    const access = UserCustomerAccess.create({
      ...validProps,
      relationship: AccessRelationship.REPRESENTATIVE,
    });

    expect(access.relationship).toBe(AccessRelationship.REPRESENTATIVE);
  });

  it('should throw for an invalid relationship value', () => {
    expect(() =>
      UserCustomerAccess.create({ ...validProps, relationship: 'OWNER' as AccessRelationship }),
    ).toThrow(DomainValidationException);
  });

  it('should reconstitute from persisted props', () => {
    const now = new Date();
    const access = UserCustomerAccess.reconstitute({
      id: 'access-uuid-1',
      userId: 'user-uuid-1',
      customerId: 'customer-uuid-1',
      relationship: AccessRelationship.SELF,
      createdAt: now,
    });

    expect(access.id).toBe('access-uuid-1');
    expect(access.createdAt).toBe(now);
  });
});
```

- [ ] **Step 6: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/domain/entities/user-customer-access.entity.spec.ts -v`
Expected: FAIL com `Cannot find module '@domain/entities/user-customer-access.entity'`.

- [ ] **Step 7: Criar o enum e a entidade**

Criar `app/src/domain/enums/access-relationship.enum.ts`:

```typescript
export enum AccessRelationship {
  SELF = 'SELF',
  REPRESENTATIVE = 'REPRESENTATIVE',
}
```

Criar `app/src/domain/entities/user-customer-access.entity.ts`:

```typescript
import { randomUUID } from 'node:crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { AccessRelationship } from '../enums/access-relationship.enum';

const VALID_RELATIONSHIPS = Object.values(AccessRelationship);

export interface CreateUserCustomerAccessProps {
  userId: string;
  customerId: string;
  relationship: AccessRelationship;
}

interface UserCustomerAccessProps extends CreateUserCustomerAccessProps {
  id: string;
  createdAt: Date;
}

export class UserCustomerAccess {
  readonly id: string;
  readonly userId: string;
  readonly customerId: string;
  readonly relationship: AccessRelationship;
  readonly createdAt: Date;

  private constructor(props: UserCustomerAccessProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.customerId = props.customerId;
    this.relationship = props.relationship;
    this.createdAt = props.createdAt;
  }

  static reconstitute(props: UserCustomerAccessProps): UserCustomerAccess {
    return new UserCustomerAccess(props);
  }

  static create(props: CreateUserCustomerAccessProps): UserCustomerAccess {
    UserCustomerAccess.validateRelationship(props.relationship);

    return new UserCustomerAccess({
      id: randomUUID(),
      userId: props.userId,
      customerId: props.customerId,
      relationship: props.relationship,
      createdAt: new Date(),
    });
  }

  private static validateRelationship(relationship: AccessRelationship): void {
    if (!VALID_RELATIONSHIPS.includes(relationship)) {
      throw new DomainValidationException(
        `Relacionamento inválido. Valores aceitos: ${VALID_RELATIONSHIPS.join(', ')}`,
      );
    }
  }
}
```

- [ ] **Step 8: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/domain/entities/user-customer-access.entity.spec.ts test/unit/domain/entities/customer.entity.spec.ts -v`
Expected: PASS (ambos os arquivos).

- [ ] **Step 9: Atualizar a factory de mock de `Customer` usada pelos testes**

Editar `app/test/helpers/customer-mock.factory.ts`, removendo `passwordHash` das duas funções:

```typescript
import { randomUUID } from 'node:crypto';
import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';

export function createMockPrismaCustomer(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: randomUUID(),
    name: 'João da Silva',
    document: '12345678909',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '11999999999',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockCustomer(overrides: Partial<Customer> = {}): Customer {
  const now = new Date();
  const type = overrides.type ?? CustomerType.INDIVIDUAL;

  return Customer.reconstitute({
    id: randomUUID(),
    name: 'João da Silva',
    document: Document.create('12345678909', type),
    type,
    email: Email.create('joao@email.com'),
    phone: Phone.create('11999999999'),
    address: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function createMockCustomerRepository(): jest.Mocked<ICustomerRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByDocument: jest.fn(),
    findByEmail: jest.fn(),
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isCustomerInUse: jest.fn(),
  };
}
```

- [ ] **Step 10: Rodar toda a suíte unitária e confirmar que nada mais referencia `passwordHash` de Customer**

Run: `cd app && npx jest test/unit 2>&1 | tail -40`
Expected: pode haver falhas em specs que ainda chamam `customer.changePassword`/`Customer.validatePasswordStrength` fora dos arquivos já tratados nesta task — se aparecerem, são specs do `create-customer.use-case` e `reset-customer-password.use-case`, tratadas nas Tasks 4 e 8. Confirme que as falhas restantes são exatamente essas duas suítes (nenhuma outra).

- [ ] **Step 11: Commit**

```bash
git add app/src/domain/entities/customer.entity.ts app/src/domain/entities/user-customer-access.entity.ts app/src/domain/enums/access-relationship.enum.ts app/test/unit/domain/entities/customer.entity.spec.ts app/test/unit/domain/entities/user-customer-access.entity.spec.ts app/test/helpers/customer-mock.factory.ts
git commit -m "feat(domain): remover senha de Customer e criar entidade UserCustomerAccess"
```

---

### Task 3: Camada de repositório — `Customer` sem senha; `IUserCustomerAccessRepository`

**Files:**
- Modify: `app/src/infrastructure/persistence/prisma/mappers/customer.mapper.ts`
- Modify: `app/src/infrastructure/persistence/prisma/repositories/prisma-customer.repository.ts`
- Modify: `app/src/domain/interfaces/repositories/customer.repository.interface.ts` (nenhuma mudança de assinatura — só segue sem `passwordHash`; incluído para conferência)
- Create: `app/src/domain/interfaces/repositories/user-customer-access.repository.interface.ts`
- Create: `app/src/infrastructure/persistence/prisma/mappers/user-customer-access.mapper.ts`
- Create: `app/src/infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository.ts`
- Modify: `app/src/infrastructure/persistence/prisma/repositories/repositories.module.ts`
- Create: `app/test/unit/infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository.spec.ts`
- Test (e2e, cobertura indireta via Task 10): `app/test/e2e/user-customer-access.e2e-spec.ts`

**Interfaces:**
- Consumes: `UserCustomerAccess` (Task 2), `PrismaService` (já existente).
- Produces: `IUserCustomerAccessRepository { create(access): Promise<UserCustomerAccess>; findByUserId(userId): Promise<UserCustomerAccess[]>; findByUserIdAndCustomerId(userId, customerId): Promise<UserCustomerAccess | null> }`.

- [ ] **Step 1: Atualizar `CustomerMapper`**

Editar `app/src/infrastructure/persistence/prisma/mappers/customer.mapper.ts` — remover `passwordHash: prismaRecord.passwordHash,` do objeto passado para `Customer.reconstitute`:

```typescript
import { Customer as PrismaCustomer, Address as PrismaAddress } from '@generated/client';
import { Customer } from '@domain/entities/customer.entity';
import { Address } from '@domain/value-objects/address.vo';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';

type PrismaCustomerWithAddress = PrismaCustomer & {
  address?: PrismaAddress | null;
};

export class CustomerMapper {
  static toDomain(prismaRecord: PrismaCustomerWithAddress): Customer {
    const type = prismaRecord.type as CustomerType;
    return Customer.reconstitute({
      id: prismaRecord.id,
      name: prismaRecord.name,
      document: Document.create(prismaRecord.document, type),
      type,
      email: Email.create(prismaRecord.email),
      phone: Phone.create(prismaRecord.phone),
      address: prismaRecord.address
        ? Address.create({
            street: prismaRecord.address.street,
            city: prismaRecord.address.city,
            state: prismaRecord.address.state,
            zipCode: prismaRecord.address.zipCode,
          })
        : null,
      createdAt: prismaRecord.createdAt,
      updatedAt: prismaRecord.updatedAt,
    });
  }
}
```

- [ ] **Step 2: Atualizar `PrismaCustomerRepository`**

Editar `app/src/infrastructure/persistence/prisma/repositories/prisma-customer.repository.ts` — remover `passwordHash: customer.passwordHash,` dos métodos `create` e `update` (no objeto `baseData`):

Em `create`, o bloco `data` passa a ser:
```typescript
        data: {
          id: customer.id,
          name: customer.name,
          type: customer.type,
          document: customer.document.value,
          email: customer.email.value,
          phone: customer.phone.value,
          ...(customer.address && {
            address: {
              create: {
                street: customer.address.street,
                city: customer.address.city,
                state: customer.address.state,
                zipCode: customer.address.zipCode.value,
              },
            },
          }),
        },
```

Em `update`, `baseData` passa a ser:
```typescript
    const baseData = {
      name: customer.name,
      document: customer.document.value,
      type: customer.type,
      email: customer.email.value,
      phone: customer.phone.value,
    };
```

O restante do arquivo (tratamento de conflito P2002, upsert de endereço, retry sem endereço em P2025, `delete`, `isCustomerInUse`) não muda.

- [ ] **Step 3: Rodar os testes unitários de customer repository/mapper e confirmar sucesso**

Run: `cd app && npx jest test/unit -t "Customer" -v 2>&1 | tail -60`
Expected: nenhuma referência a `passwordHash` falhando; specs de `create-customer`, `update-customer` etc. continuam verdes (serão ajustadas na Task 4 se ainda citarem senha).

- [ ] **Step 4: Escrever o teste que falha para `PrismaUserCustomerAccessRepository`**

Criar `app/test/unit/infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository.spec.ts`:

```typescript
import { PrismaUserCustomerAccessRepository } from '@infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

describe('PrismaUserCustomerAccessRepository', () => {
  let repository: PrismaUserCustomerAccessRepository;
  let prisma: { userCustomerAccess: Record<string, jest.Mock> };

  beforeEach(() => {
    prisma = {
      userCustomerAccess: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    repository = new PrismaUserCustomerAccessRepository(prisma as never);
  });

  it('should create an access link', async () => {
    const access = UserCustomerAccess.create({
      userId: 'user-1',
      customerId: 'customer-1',
      relationship: AccessRelationship.SELF,
    });

    prisma.userCustomerAccess.create.mockResolvedValue({
      id: access.id,
      userId: access.userId,
      customerId: access.customerId,
      relationship: access.relationship,
      createdAt: access.createdAt,
    });

    const result = await repository.create(access);

    expect(prisma.userCustomerAccess.create).toHaveBeenCalledWith({
      data: {
        id: access.id,
        userId: access.userId,
        customerId: access.customerId,
        relationship: access.relationship,
      },
    });
    expect(result.id).toBe(access.id);
  });

  it('should find all access links for a user', async () => {
    const now = new Date();
    prisma.userCustomerAccess.findMany.mockResolvedValue([
      { id: 'a1', userId: 'user-1', customerId: 'customer-1', relationship: 'SELF', createdAt: now },
      {
        id: 'a2',
        userId: 'user-1',
        customerId: 'customer-2',
        relationship: 'REPRESENTATIVE',
        createdAt: now,
      },
    ]);

    const result = await repository.findByUserId('user-1');

    expect(prisma.userCustomerAccess.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.customerId)).toEqual(['customer-1', 'customer-2']);
  });

  it('should return null when no access link exists for the pair', async () => {
    prisma.userCustomerAccess.findUnique.mockResolvedValue(null);

    const result = await repository.findByUserIdAndCustomerId('user-1', 'customer-1');

    expect(prisma.userCustomerAccess.findUnique).toHaveBeenCalledWith({
      where: { userId_customerId: { userId: 'user-1', customerId: 'customer-1' } },
    });
    expect(result).toBeNull();
  });

  it('should throw ResourceConflictException when the pair already has a link', async () => {
    const { Prisma } = jest.requireActual('@generated/client');
    const access = UserCustomerAccess.create({
      userId: 'user-1',
      customerId: 'customer-1',
      relationship: AccessRelationship.SELF,
    });

    prisma.userCustomerAccess.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.8.0',
      }),
    );

    await expect(repository.create(access)).rejects.toThrow('já está vinculado');
  });
});
```

- [ ] **Step 5: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository.spec.ts -v`
Expected: FAIL — módulo não existe.

- [ ] **Step 6: Criar a interface, o mapper e o repositório**

Criar `app/src/domain/interfaces/repositories/user-customer-access.repository.interface.ts`:

```typescript
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';

export interface IUserCustomerAccessRepository {
  create(access: UserCustomerAccess): Promise<UserCustomerAccess>;
  findByUserId(userId: string): Promise<UserCustomerAccess[]>;
  findByUserIdAndCustomerId(userId: string, customerId: string): Promise<UserCustomerAccess | null>;
}
```

Criar `app/src/infrastructure/persistence/prisma/mappers/user-customer-access.mapper.ts`:

```typescript
import { UserCustomerAccess as PrismaUserCustomerAccess } from '@generated/client';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

export class UserCustomerAccessMapper {
  static toDomain(record: PrismaUserCustomerAccess): UserCustomerAccess {
    return UserCustomerAccess.reconstitute({
      id: record.id,
      userId: record.userId,
      customerId: record.customerId,
      relationship: record.relationship as AccessRelationship,
      createdAt: record.createdAt,
    });
  }
}
```

Criar `app/src/infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/client';
import { PrismaService } from '../prisma.service';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { IUserCustomerAccessRepository } from '@domain/interfaces/repositories/user-customer-access.repository.interface';
import { UserCustomerAccessMapper } from '../mappers/user-customer-access.mapper';

@Injectable()
export class PrismaUserCustomerAccessRepository implements IUserCustomerAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(access: UserCustomerAccess): Promise<UserCustomerAccess> {
    try {
      const record = await this.prisma.userCustomerAccess.create({
        data: {
          id: access.id,
          userId: access.userId,
          customerId: access.customerId,
          relationship: access.relationship,
        },
      });

      return UserCustomerAccessMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException('Este usuário já está vinculado a este cliente.');
      }
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<UserCustomerAccess[]> {
    const records = await this.prisma.userCustomerAccess.findMany({ where: { userId } });
    return records.map((record) => UserCustomerAccessMapper.toDomain(record));
  }

  async findByUserIdAndCustomerId(
    userId: string,
    customerId: string,
  ): Promise<UserCustomerAccess | null> {
    const record = await this.prisma.userCustomerAccess.findUnique({
      where: { userId_customerId: { userId, customerId } },
    });

    return record ? UserCustomerAccessMapper.toDomain(record) : null;
  }
}
```

- [ ] **Step 7: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository.spec.ts -v`
Expected: PASS.

- [ ] **Step 8: Registrar o novo repositório em `repositories.module.ts`**

Editar `app/src/infrastructure/persistence/prisma/repositories/repositories.module.ts` — adicionar o import e o provider:

```typescript
import { PrismaUserCustomerAccessRepository } from './prisma-user-customer-access.repository';
```

E no array `REPOSITORY_PROVIDERS`, adicionar:
```typescript
  { provide: 'IUserCustomerAccessRepository', useClass: PrismaUserCustomerAccessRepository },
```

- [ ] **Step 9: Rodar o build para confirmar que a injeção de dependência resolve**

Run: `cd app && npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 10: Commit**

```bash
git add app/src/infrastructure/persistence/prisma/mappers/customer.mapper.ts app/src/infrastructure/persistence/prisma/mappers/user-customer-access.mapper.ts app/src/infrastructure/persistence/prisma/repositories/prisma-customer.repository.ts app/src/infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository.ts app/src/infrastructure/persistence/prisma/repositories/repositories.module.ts app/src/domain/interfaces/repositories/user-customer-access.repository.interface.ts app/test/unit/infrastructure/persistence/prisma/repositories/prisma-user-customer-access.repository.spec.ts
git commit -m "feat(persistence): repositório de UserCustomerAccess e remoção de senha de Customer na camada de dados"
```

---

### Task 4: Application — `CreateCustomerUseCase` sem senha; `CreateUserCustomerAccessUseCase`

**Files:**
- Modify: `app/src/application/use-cases/customer/create-customer.use-case.ts`
- Modify: `app/test/unit/application/use-cases/customer/create-customer.use-case.spec.ts`
- Create: `app/src/application/ports/input/customer/dto/create-user-customer-access.dto.ts`
- Create: `app/src/application/ports/input/customer/create-user-customer-access.use-case.interface.ts`
- Create: `app/src/application/use-cases/customer/create-user-customer-access.use-case.ts`
- Create: `app/test/unit/application/use-cases/customer/create-user-customer-access.use-case.spec.ts`

**Interfaces:**
- Consumes: `ICustomerRepository`, `IUserRepository` (já existente), `IUserCustomerAccessRepository` (Task 3), `UserCustomerAccess.create` (Task 2).
- Produces: `ICreateUserCustomerAccessUseCase { execute(input: CreateUserCustomerAccessDto): Promise<UserCustomerAccess> }`, `CreateUserCustomerAccessDto { userId, customerId, relationship }`.

- [ ] **Step 1: Escrever o teste que falha para `CreateCustomerUseCase` sem senha**

Substituir o conteúdo de `app/test/unit/application/use-cases/customer/create-customer.use-case.spec.ts` por:

```typescript
import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { Document } from '@domain/value-objects/document.vo';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import {
  createMockCustomer,
  createMockCustomerRepository,
} from '../../../../helpers/customer-mock.factory';

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;

  const validInput = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '11999999999',
    address: { street: 'Rua das Flores, 123', city: 'São Paulo', state: 'SP', zipCode: '01310100' },
  };

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    useCase = new CreateCustomerUseCase(customerRepository);
  });

  it('should create customer when document and email are unique', async () => {
    const sanitizedDocument = '12345678909';

    const saved = createMockCustomer({
      name: validInput.name,
      document: Document.create(sanitizedDocument, validInput.type),
      type: validInput.type,
      email: Email.create(validInput.email),
      phone: Phone.create(validInput.phone),
    });

    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(null);
    customerRepository.create.mockResolvedValue(saved);

    const result = await useCase.execute(validInput);

    expect(result).toEqual(saved);
    expect(customerRepository.findByDocument).toHaveBeenCalledWith(sanitizedDocument);
    expect(customerRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should throw ResourceConflictException if document already exists', async () => {
    customerRepository.findByDocument.mockResolvedValue(createMockCustomer());
    customerRepository.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute(validInput)).rejects.toThrow(ResourceConflictException);
    expect(customerRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException if email already exists', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(createMockCustomer());

    await expect(useCase.execute(validInput)).rejects.toThrow(ResourceConflictException);
    expect(customerRepository.create).not.toHaveBeenCalled();
  });

  it('should never generate or persist a password for the customer', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(null);
    customerRepository.create.mockImplementation((customer) => Promise.resolve(customer));

    const result = await useCase.execute(validInput);

    expect(result).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/application/use-cases/customer/create-customer.use-case.spec.ts -v`
Expected: FAIL — `new CreateCustomerUseCase(customerRepository)` não confere com o construtor atual (que exige `hashService, emailSenderService`).

- [ ] **Step 3: Simplificar `CreateCustomerUseCase`**

Substituir o conteúdo de `app/src/application/use-cases/customer/create-customer.use-case.ts` por:

```typescript
import { Customer } from '@domain/entities/customer.entity';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { ICreateCustomerUseCase } from '@application/ports/input/customer/create-customer.use-case.interface';

import { CreateCustomerDto } from '@application/ports/input/customer/dto/create-customer.dto';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class CreateCustomerUseCase implements ICreateCustomerUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(input: CreateCustomerDto): Promise<Customer> {
    const document = Document.create(input.document, input.type);
    const email = Email.create(input.email);

    const existingByDocument = await this.customerRepository.findByDocument(document.value);

    if (existingByDocument) {
      throw new ResourceConflictException(`Documento '${document.value}' já está cadastrado.`);
    }

    const existingByEmail = await this.customerRepository.findByEmail(email.value);

    if (existingByEmail) {
      throw new ResourceConflictException(`E-mail '${email.value}' já está cadastrado.`);
    }

    const customer = Customer.create(input);

    return this.customerRepository.create(customer);
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/application/use-cases/customer/create-customer.use-case.spec.ts -v`
Expected: PASS (4 testes).

- [ ] **Step 5: Escrever o teste que falha para `CreateUserCustomerAccessUseCase`**

Criar `app/test/unit/application/use-cases/customer/create-user-customer-access.use-case.spec.ts`:

```typescript
import { CreateUserCustomerAccessUseCase } from '@application/use-cases/customer/create-user-customer-access.use-case';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import {
  createMockCustomer,
  createMockCustomerRepository,
} from '../../../../helpers/customer-mock.factory';
import { Document } from '@domain/value-objects/document.vo';

describe('CreateUserCustomerAccessUseCase', () => {
  let useCase: CreateUserCustomerAccessUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let accessRepository: { create: jest.Mock; findByUserId: jest.Mock; findByUserIdAndCustomerId: jest.Mock };

  beforeEach(() => {
    userRepository = createMockUserRepository();
    customerRepository = createMockCustomerRepository();
    accessRepository = { create: jest.fn(), findByUserId: jest.fn(), findByUserIdAndCustomerId: jest.fn() };
    useCase = new CreateUserCustomerAccessUseCase(userRepository, customerRepository, accessRepository);
  });

  it('should create a SELF link when documents match', async () => {
    const user = createMockUser({
      role: UserRole.CUSTOMER,
      document: Document.create('12345678909'),
    });
    const customer = createMockCustomer({
      type: CustomerType.INDIVIDUAL,
      document: Document.create('12345678909', CustomerType.INDIVIDUAL),
    });

    userRepository.findById.mockResolvedValue(user);
    customerRepository.findById.mockResolvedValue(customer);
    accessRepository.create.mockImplementation((access) => Promise.resolve(access));

    const result = await useCase.execute({
      userId: user.id,
      customerId: customer.id,
      relationship: AccessRelationship.SELF,
    });

    expect(result.relationship).toBe(AccessRelationship.SELF);
    expect(accessRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should throw DomainValidationException for SELF when documents differ', async () => {
    const user = createMockUser({ role: UserRole.CUSTOMER, document: Document.create('12345678909') });
    const customer = createMockCustomer({
      document: Document.create('98765432100', CustomerType.INDIVIDUAL),
    });

    userRepository.findById.mockResolvedValue(user);
    customerRepository.findById.mockResolvedValue(customer);

    await expect(
      useCase.execute({ userId: user.id, customerId: customer.id, relationship: AccessRelationship.SELF }),
    ).rejects.toThrow(DomainValidationException);
    expect(accessRepository.create).not.toHaveBeenCalled();
  });

  it('should create a REPRESENTATIVE link even when documents differ', async () => {
    const user = createMockUser({ role: UserRole.CUSTOMER, document: Document.create('12345678909') });
    const customer = createMockCustomer({
      type: CustomerType.COMPANY,
      document: Document.create('12345678000195', CustomerType.COMPANY),
    });

    userRepository.findById.mockResolvedValue(user);
    customerRepository.findById.mockResolvedValue(customer);
    accessRepository.create.mockImplementation((access) => Promise.resolve(access));

    const result = await useCase.execute({
      userId: user.id,
      customerId: customer.id,
      relationship: AccessRelationship.REPRESENTATIVE,
    });

    expect(result.relationship).toBe(AccessRelationship.REPRESENTATIVE);
  });

  it('should throw ResourceNotFoundException when the customer does not exist', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'user-1', customerId: 'missing', relationship: AccessRelationship.SELF }),
    ).rejects.toThrow(ResourceNotFoundException);
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when the user does not exist', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    userRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'missing', customerId: customer.id, relationship: AccessRelationship.SELF }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw DomainValidationException when the user role is not CUSTOMER', async () => {
    const user = createMockUser({ role: UserRole.ATTENDANT });
    const customer = createMockCustomer();

    userRepository.findById.mockResolvedValue(user);
    customerRepository.findById.mockResolvedValue(customer);

    await expect(
      useCase.execute({ userId: user.id, customerId: customer.id, relationship: AccessRelationship.SELF }),
    ).rejects.toThrow(DomainValidationException);
    expect(accessRepository.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/application/use-cases/customer/create-user-customer-access.use-case.spec.ts -v`
Expected: FAIL — módulo não existe.

- [ ] **Step 7: Criar o DTO, a interface e o use case**

Criar `app/src/application/ports/input/customer/dto/create-user-customer-access.dto.ts`:

```typescript
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

export interface CreateUserCustomerAccessDto {
  userId: string;
  customerId: string;
  relationship: AccessRelationship;
}
```

Criar `app/src/application/ports/input/customer/create-user-customer-access.use-case.interface.ts`:

```typescript
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { CreateUserCustomerAccessDto } from './dto/create-user-customer-access.dto';

export interface ICreateUserCustomerAccessUseCase {
  execute(input: CreateUserCustomerAccessDto): Promise<UserCustomerAccess>;
}
```

Criar `app/src/application/use-cases/customer/create-user-customer-access.use-case.ts`:

```typescript
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import { UserRole } from '@domain/enums/user-role.enum';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IUserCustomerAccessRepository } from '@domain/interfaces/repositories/user-customer-access.repository.interface';

import { ICreateUserCustomerAccessUseCase } from '@application/ports/input/customer/create-user-customer-access.use-case.interface';
import { CreateUserCustomerAccessDto } from '@application/ports/input/customer/dto/create-user-customer-access.dto';

import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

export class CreateUserCustomerAccessUseCase implements ICreateUserCustomerAccessUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly accessRepository: IUserCustomerAccessRepository,
  ) {}

  async execute(input: CreateUserCustomerAccessDto): Promise<UserCustomerAccess> {
    const customer = await this.customerRepository.findById(input.customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', input.customerId);
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', input.userId);
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new DomainValidationException(
        'Só é possível vincular um cliente a um usuário com a role CUSTOMER.',
      );
    }

    if (
      input.relationship === AccessRelationship.SELF &&
      user.document.value !== customer.document.value
    ) {
      throw new DomainValidationException(
        'Para um vínculo SELF, o documento do usuário deve ser igual ao documento do cliente.',
      );
    }

    const access = UserCustomerAccess.create(input);

    return this.accessRepository.create(access);
  }
}
```

- [ ] **Step 8: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/application/use-cases/customer -v`
Expected: PASS (todas as suítes de `customer` use cases, incluindo `create-customer` e `create-user-customer-access`).

- [ ] **Step 9: Commit**

```bash
git add app/src/application/use-cases/customer/create-customer.use-case.ts app/src/application/use-cases/customer/create-user-customer-access.use-case.ts app/src/application/ports/input/customer/create-user-customer-access.use-case.interface.ts app/src/application/ports/input/customer/dto/create-user-customer-access.dto.ts app/test/unit/application/use-cases/customer/create-customer.use-case.spec.ts app/test/unit/application/use-cases/customer/create-user-customer-access.use-case.spec.ts
git commit -m "feat(customer): simplificar CreateCustomerUseCase e criar CreateUserCustomerAccessUseCase"
```

---

### Task 5: HTTP — `POST /customers/:id/access`, remoção de `PATCH /customers/:id/password`

**Files:**
- Create: `app/src/interface-adapters/customer/requests/create-user-customer-access-request.ts`
- Create: `app/src/interface-adapters/customer/responses/user-customer-access.response.ts`
- Modify: `app/src/interface-adapters/customer/customer.presenter.ts`
- Modify: `app/src/interface-adapters/customer/customer.controller.ts`
- Modify: `app/test/unit/interface-adapters/customer/customer.controller.spec.ts`
- Create: `app/src/infrastructure/http/controllers/customer/dto/requests/create-user-customer-access-request.dto.ts`
- Create: `app/src/infrastructure/http/controllers/customer/dto/responses/user-customer-access-response.dto.ts`
- Modify: `app/src/infrastructure/http/controllers/customer/customer.controller.ts`
- Modify: `app/test/unit/infrastructure/http/controllers/customer/customer.controller.spec.ts`
- Modify: `app/src/infrastructure/http/controllers/customer/customer.module.ts`

**Interfaces:**
- Consumes: `ICreateUserCustomerAccessUseCase` (Task 4).
- Produces: `POST /customers/:id/access` → 201 com `{ data: { id, userId, customerId, relationship, createdAt } }`.

- [ ] **Step 1: Escrever o teste que falha para o clean `CustomerController`**

Editar `app/test/unit/interface-adapters/customer/customer.controller.spec.ts` — substituir o import de `ResetCustomerPasswordUseCase` e o describe `resetPassword`:

```typescript
import { randomUUID } from 'node:crypto';

import { CustomerController } from '@interface-adapters/customer/customer.controller';
import { CustomerPresenter } from '@interface-adapters/customer/customer.presenter';

import { ICreateCustomerUseCase } from '@application/ports/input/customer/create-customer.use-case.interface';
import { IFindAllCustomersUseCase } from '@application/ports/input/customer/find-all-customers.use-case.interface';
import { IFindCustomerByIdUseCase } from '@application/ports/input/customer/find-customer-by-id.use-case.interface';
import { IUpdateCustomerUseCase } from '@application/ports/input/customer/update-customer.use-case.interface';
import { IDeleteCustomerUseCase } from '@application/ports/input/customer/delete-customer.use-case.interface';
import { ICreateUserCustomerAccessUseCase } from '@application/ports/input/customer/create-user-customer-access.use-case.interface';

import { CustomerType } from '@domain/enums/customer-type.enum';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';
import { UpdateCustomerRequest } from '@interface-adapters/customer/requests/update-customer-request';

import { createMockCustomer } from '../../../helpers/customer-mock.factory';

describe('CustomerController', () => {
  let controller: CustomerController;
  let createUseCase: jest.Mocked<ICreateCustomerUseCase>;
  let findAllUseCase: jest.Mocked<IFindAllCustomersUseCase>;
  let findByIdUseCase: jest.Mocked<IFindCustomerByIdUseCase>;
  let updateUseCase: jest.Mocked<IUpdateCustomerUseCase>;
  let deleteUseCase: jest.Mocked<IDeleteCustomerUseCase>;
  let createAccessUseCase: jest.Mocked<ICreateUserCustomerAccessUseCase>;

  beforeEach(() => {
    createUseCase = { execute: jest.fn() };
    findAllUseCase = { execute: jest.fn() };
    findByIdUseCase = { execute: jest.fn() };
    updateUseCase = { execute: jest.fn() };
    deleteUseCase = { execute: jest.fn() };
    createAccessUseCase = { execute: jest.fn() };
    controller = new CustomerController(
      createUseCase,
      findAllUseCase,
      findByIdUseCase,
      updateUseCase,
      deleteUseCase,
      createAccessUseCase,
    );
  });

  describe('create', () => {
    it('should return customer wrapped in data', async () => {
      const input = {
        name: 'João da Silva',
        document: '123.456.789-09',
        type: CustomerType.INDIVIDUAL,
        email: 'joao@email.com',
        phone: '11999999999',
        address: {
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310100',
        },
      };

      const created = createMockCustomer({
        name: input.name,
        document: Document.create(input.document, input.type),
        type: input.type,
        email: Email.create(input.email),
        phone: Phone.create(input.phone),
      });

      createUseCase.execute.mockResolvedValue(created);

      const result = await controller.create(input);

      expect(result).toEqual(CustomerPresenter.toDataResponse(created));
      expect(createUseCase.execute).toHaveBeenCalledWith(input);
    });
  });

  describe('findAll', () => {
    it('should default page and limit when missing and forward filters', async () => {
      const customers = [createMockCustomer(), createMockCustomer()];

      findAllUseCase.execute.mockResolvedValue({
        items: customers,
        pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
      });

      const result = await controller.findAll({ name: 'João' });

      expect(result).toEqual(
        CustomerPresenter.toPaginatedDataResponse({
          items: customers,
          pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
        }),
      );

      expect(findAllUseCase.execute).toHaveBeenCalledWith({ page: 1, limit: 10, name: 'João' });
    });

    it('should forward provided page and limit', async () => {
      findAllUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 2, limit: 5 },
      });

      await controller.findAll({ page: 2, limit: 5 });

      expect(findAllUseCase.execute).toHaveBeenCalledWith({ page: 2, limit: 5 });
    });
  });

  describe('findById', () => {
    it('should return customer wrapped in data', async () => {
      const customer = createMockCustomer();
      findByIdUseCase.execute.mockResolvedValue(customer);

      const result = await controller.findById(customer.id);

      expect(result).toEqual(CustomerPresenter.toDataResponse(customer));
      expect(findByIdUseCase.execute).toHaveBeenCalledWith(customer.id);
    });
  });

  describe('update', () => {
    it('should return updated customer wrapped in data', async () => {
      const input: UpdateCustomerRequest = {
        name: 'Novo Nome',
        document: '123.456.789-09',
        type: CustomerType.INDIVIDUAL,
        email: 'joao@email.com',
        phone: '11999999999',
        address: {
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310100',
        },
      };

      const updated = createMockCustomer({ name: input.name });
      updateUseCase.execute.mockResolvedValue(updated);

      const result = await controller.update(updated.id, input);

      expect(result).toEqual(CustomerPresenter.toDataResponse(updated));
      expect(updateUseCase.execute).toHaveBeenCalledWith(updated.id, input);
    });
  });

  describe('remove', () => {
    it('should call the delete use case with the correct id', async () => {
      const id = randomUUID();
      deleteUseCase.execute.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(deleteUseCase.execute).toHaveBeenCalledWith(id);
    });
  });

  describe('createAccess', () => {
    it('should delegate to the create-access use case and return the link wrapped in data', async () => {
      const customerId = randomUUID();
      const input = { userId: randomUUID(), relationship: AccessRelationship.SELF };

      const created = UserCustomerAccess.create({ customerId, ...input });
      createAccessUseCase.execute.mockResolvedValue(created);

      const result = await controller.createAccess(customerId, input);

      expect(result).toEqual(CustomerPresenter.toAccessDataResponse(created));
      expect(createAccessUseCase.execute).toHaveBeenCalledWith({ customerId, ...input });
    });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/interface-adapters/customer/customer.controller.spec.ts -v`
Expected: FAIL — `CustomerPresenter.toAccessDataResponse` não existe; `controller.createAccess` não existe.

- [ ] **Step 3: Criar os requests/responses do interface-adapters e atualizar o presenter e o controller**

Criar `app/src/interface-adapters/customer/requests/create-user-customer-access-request.ts`:

```typescript
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

export interface CreateUserCustomerAccessRequest {
  userId: string;
  relationship: AccessRelationship;
}
```

Criar `app/src/interface-adapters/customer/responses/user-customer-access.response.ts`:

```typescript
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

export interface UserCustomerAccessResponse {
  id: string;
  userId: string;
  customerId: string;
  relationship: AccessRelationship;
  createdAt: Date;
}

export interface UserCustomerAccessDataResponse {
  data: UserCustomerAccessResponse;
}
```

Editar `app/src/interface-adapters/customer/customer.presenter.ts`, adicionando ao final da classe (antes do `}` de fechamento):

```typescript
  static toAccessResponse(access: UserCustomerAccess): UserCustomerAccessResponse {
    return {
      id: access.id,
      userId: access.userId,
      customerId: access.customerId,
      relationship: access.relationship,
      createdAt: access.createdAt,
    };
  }

  static toAccessDataResponse(access: UserCustomerAccess): UserCustomerAccessDataResponse {
    return { data: CustomerPresenter.toAccessResponse(access) };
  }
```

E adicionar os imports no topo do mesmo arquivo:

```typescript
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import {
  UserCustomerAccessDataResponse,
  UserCustomerAccessResponse,
} from './responses/user-customer-access.response';
```

Editar `app/src/interface-adapters/customer/customer.controller.ts` — trocar o import e o parâmetro do construtor, remover `resetPassword`, adicionar `createAccess`:

```typescript
import { ICreateCustomerUseCase } from '@application/ports/input/customer/create-customer.use-case.interface';
import { IFindAllCustomersUseCase } from '@application/ports/input/customer/find-all-customers.use-case.interface';
import { IFindCustomerByIdUseCase } from '@application/ports/input/customer/find-customer-by-id.use-case.interface';
import { IUpdateCustomerUseCase } from '@application/ports/input/customer/update-customer.use-case.interface';
import { IDeleteCustomerUseCase } from '@application/ports/input/customer/delete-customer.use-case.interface';
import { ICreateUserCustomerAccessUseCase } from '@application/ports/input/customer/create-user-customer-access.use-case.interface';

import { CreateCustomerRequest } from './requests/create-customer-request';
import { UpdateCustomerRequest } from './requests/update-customer-request';
import { FindAllCustomersQuery } from './requests/find-all-customers-query';
import { CreateUserCustomerAccessRequest } from './requests/create-user-customer-access-request';

import { CustomerPresenter } from './customer.presenter';
import {
  CustomerDataResponse,
  CustomerPaginatedResponse,
} from './responses/customer.response';
import { UserCustomerAccessDataResponse } from './responses/user-customer-access.response';

export class CustomerController {
  constructor(
    private readonly createCustomerUseCase: ICreateCustomerUseCase,
    private readonly findAllCustomersUseCase: IFindAllCustomersUseCase,
    private readonly findCustomerByIdUseCase: IFindCustomerByIdUseCase,
    private readonly updateCustomerUseCase: IUpdateCustomerUseCase,
    private readonly deleteCustomerUseCase: IDeleteCustomerUseCase,
    private readonly createUserCustomerAccessUseCase: ICreateUserCustomerAccessUseCase,
  ) {}

  async create(input: CreateCustomerRequest): Promise<CustomerDataResponse> {
    const customer = await this.createCustomerUseCase.execute(input);
    return CustomerPresenter.toDataResponse(customer);
  }

  async findAll(query: FindAllCustomersQuery): Promise<CustomerPaginatedResponse> {
    const result = await this.findAllCustomersUseCase.execute({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });

    return CustomerPresenter.toPaginatedDataResponse(result);
  }

  async findById(id: string): Promise<CustomerDataResponse> {
    const customer = await this.findCustomerByIdUseCase.execute(id);
    return CustomerPresenter.toDataResponse(customer);
  }

  async update(id: string, input: UpdateCustomerRequest): Promise<CustomerDataResponse> {
    const customer = await this.updateCustomerUseCase.execute(id, input);
    return CustomerPresenter.toDataResponse(customer);
  }

  async remove(id: string): Promise<void> {
    await this.deleteCustomerUseCase.execute(id);
  }

  async createAccess(
    customerId: string,
    input: CreateUserCustomerAccessRequest,
  ): Promise<UserCustomerAccessDataResponse> {
    const access = await this.createUserCustomerAccessUseCase.execute({
      customerId,
      userId: input.userId,
      relationship: input.relationship,
    });
    return CustomerPresenter.toAccessDataResponse(access);
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/interface-adapters/customer/customer.controller.spec.ts -v`
Expected: PASS.

- [ ] **Step 5: Escrever o teste que falha para o `CustomerController` HTTP**

Editar `app/test/unit/infrastructure/http/controllers/customer/customer.controller.spec.ts`, trocando o `beforeEach` (5 mocks + 1 mock em vez de 6) e o describe `resetPassword` por `createAccess`:

```typescript
import { randomUUID } from 'node:crypto';

import { CustomerController } from '@infrastructure/http/controllers/customer/customer.controller';
import { CustomerController as CustomerCleanController } from '@interface-adapters/customer/customer.controller';

import { CreateCustomerRequestDto } from '@infrastructure/http/controllers/customer/dto/requests/create-customer-request.dto';
import { FindAllCustomersQueryDto } from '@infrastructure/http/controllers/customer/dto/requests/filter-customers.dto';
import { CreateUserCustomerAccessRequestDto } from '@infrastructure/http/controllers/customer/dto/requests/create-user-customer-access-request.dto';

import { CustomerPresenter } from '@interface-adapters/customer/customer.presenter';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';

import { createMockCustomer } from '../../../../../helpers/customer-mock.factory';

describe('CustomerController', () => {
  let httpController: CustomerController;
  let cleanController: CustomerCleanController;

  const customerRequestStub: CreateCustomerRequestDto = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '11999999999',
    address: {
      street: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310100',
    },
  };

  beforeEach(() => {
    cleanController = new CustomerCleanController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new CustomerController(cleanController);
  });

  describe('create', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const response = CustomerPresenter.toDataResponse(createMockCustomer());
      jest.spyOn(cleanController, 'create').mockResolvedValue(response);

      const result = await httpController.create(customerRequestStub);

      expect(result).toBe(response);
      expect(cleanController.create).toHaveBeenCalledWith(customerRequestStub);
    });
  });

  describe('findAll', () => {
    it('should pass the query straight to the clean controller and return its result', async () => {
      const query: FindAllCustomersQueryDto = { page: 1, limit: 10, name: 'João' };
      const response = CustomerPresenter.toPaginatedDataResponse({
        items: [createMockCustomer()],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });
      jest.spyOn(cleanController, 'findAll').mockResolvedValue(response);

      const result = await httpController.findAll(query);

      expect(result).toBe(response);
      expect(cleanController.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findById', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const customer = createMockCustomer();
      const response = CustomerPresenter.toDataResponse(customer);
      jest.spyOn(cleanController, 'findById').mockResolvedValue(response);

      const result = await httpController.findById(customer.id);

      expect(result).toBe(response);
      expect(cleanController.findById).toHaveBeenCalledWith(customer.id);
    });
  });

  describe('update', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const id = randomUUID();
      const response = CustomerPresenter.toDataResponse(createMockCustomer({ name: 'Novo Nome' }));
      jest.spyOn(cleanController, 'update').mockResolvedValue(response);

      const result = await httpController.update(id, customerRequestStub);

      expect(result).toBe(response);
      expect(cleanController.update).toHaveBeenCalledWith(id, customerRequestStub);
    });
  });

  describe('remove', () => {
    it('should delegate to the clean controller', async () => {
      const id = randomUUID();
      jest.spyOn(cleanController, 'remove').mockResolvedValue(undefined);

      await httpController.remove(id);

      expect(cleanController.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('createAccess', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const customerId = randomUUID();
      const request: CreateUserCustomerAccessRequestDto = {
        userId: randomUUID(),
        relationship: AccessRelationship.SELF,
      };
      const created = UserCustomerAccess.create({ customerId, ...request });
      const response = CustomerPresenter.toAccessDataResponse(created);
      jest.spyOn(cleanController, 'createAccess').mockResolvedValue(response);

      const result = await httpController.createAccess(customerId, request);

      expect(result).toBe(response);
      expect(cleanController.createAccess).toHaveBeenCalledWith(customerId, request);
    });
  });
});
```

- [ ] **Step 6: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/infrastructure/http/controllers/customer/customer.controller.spec.ts -v`
Expected: FAIL — DTO `CreateUserCustomerAccessRequestDto` e o método `createAccess` no controller HTTP ainda não existem.

- [ ] **Step 7: Criar os DTOs HTTP e editar o controller e o módulo**

Criar `app/src/infrastructure/http/controllers/customer/dto/requests/create-user-customer-access-request.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

export class CreateUserCustomerAccessRequestDto {
  @ApiProperty({
    description: 'ID do usuário (deve ter role CUSTOMER) a vincular a este cliente',
    format: 'uuid',
  })
  @IsUUID(undefined, { message: 'O ID do usuário deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do usuário é obrigatório.' })
  userId!: string;

  @ApiProperty({
    enum: AccessRelationship,
    description:
      'SELF: o usuário é a própria pessoa física titular deste cliente (documentos devem coincidir). ' +
      'REPRESENTATIVE: o usuário representa este cliente (pessoa jurídica).',
    example: AccessRelationship.SELF,
  })
  @IsEnum(AccessRelationship, { message: 'O relacionamento deve ser SELF ou REPRESENTATIVE.' })
  @IsNotEmpty({ message: 'O relacionamento é obrigatório.' })
  relationship!: AccessRelationship;
}
```

Criar `app/src/infrastructure/http/controllers/customer/dto/responses/user-customer-access-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import {
  UserCustomerAccessDataResponse,
  UserCustomerAccessResponse,
} from '@interface-adapters/customer/responses/user-customer-access.response';

export class UserCustomerAccessResponseDto implements UserCustomerAccessResponse {
  @ApiProperty({ description: 'ID do vínculo', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'ID do usuário vinculado', format: 'uuid' })
  userId!: string;

  @ApiProperty({ description: 'ID do cliente vinculado', format: 'uuid' })
  customerId!: string;

  @ApiProperty({ enum: AccessRelationship })
  relationship!: AccessRelationship;

  @ApiProperty({ description: 'Data de criação do vínculo' })
  createdAt!: Date;
}

export class UserCustomerAccessDataResponseDto implements UserCustomerAccessDataResponse {
  @ApiProperty({ type: UserCustomerAccessResponseDto })
  data!: UserCustomerAccessResponseDto;
}
```

Editar `app/src/infrastructure/http/controllers/customer/customer.controller.ts` — remover o import de `HttpCode`/`HttpStatus`/`ApiNoContentResponse` **apenas se** deixarem de ser usados (`remove()` ainda usa `HttpCode(HttpStatus.NO_CONTENT)` e `ApiNoContentResponse`, então esses imports continuam). Remover o bloco `@Patch(':id/password')`/`resetPassword` por completo e adicionar, no lugar, importando `CreateUserCustomerAccessRequestDto` e `UserCustomerAccessDataResponseDto`:

```typescript
  @Post(':id/access')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @ApiOperation({ summary: 'Vincular um usuário (role CUSTOMER) a este cliente' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do Cliente' })
  @ApiCreatedResponse({
    type: UserCustomerAccessDataResponseDto,
    description: 'Vínculo criado com sucesso',
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado' })
  @ApiForbiddenResponse({ description: 'Acesso negado' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiNotFoundResponse({ description: 'Cliente ou usuário não encontrado' })
  @ApiConflictResponse({ description: 'Usuário já vinculado a este cliente' })
  @ApiUnprocessableEntityResponse({
    description:
      'Usuário não tem role CUSTOMER, ou documento não coincide com o do cliente para vínculo SELF',
  })
  createAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: CreateUserCustomerAccessRequestDto,
  ): Promise<UserCustomerAccessDataResponseDto> {
    return this.controller.createAccess(id, request);
  }
```

Editar `app/src/infrastructure/http/controllers/customer/customer.module.ts` por completo:

```typescript
import { Module } from '@nestjs/common';

import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { FindAllCustomersUseCase } from '@application/use-cases/customer/find-all-customers.use-case';
import { FindCustomerByIdUseCase } from '@application/use-cases/customer/find-customer-by-id.use-case';
import { UpdateCustomerUseCase } from '@application/use-cases/customer/update-customer.use-case';
import { DeleteCustomerUseCase } from '@application/use-cases/customer/delete-customer.use-case';
import { CreateUserCustomerAccessUseCase } from '@application/use-cases/customer/create-user-customer-access.use-case';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IUserCustomerAccessRepository } from '@domain/interfaces/repositories/user-customer-access.repository.interface';

import { CustomerController as CustomerCleanController } from '@interface-adapters/customer/customer.controller';
import { CustomerController } from './customer.controller';

@Module({
  controllers: [CustomerController],
  providers: [
    {
      provide: CustomerCleanController,
      useFactory: (
        customerRepository: ICustomerRepository,
        userRepository: IUserRepository,
        accessRepository: IUserCustomerAccessRepository,
      ) =>
        new CustomerCleanController(
          new CreateCustomerUseCase(customerRepository),
          new FindAllCustomersUseCase(customerRepository),
          new FindCustomerByIdUseCase(customerRepository),
          new UpdateCustomerUseCase(customerRepository),
          new DeleteCustomerUseCase(customerRepository),
          new CreateUserCustomerAccessUseCase(userRepository, customerRepository, accessRepository),
        ),
      inject: ['ICustomerRepository', 'IUserRepository', 'IUserCustomerAccessRepository'],
    },
  ],
})
export class CustomerModule {}
```

Note: `InfrastructureServicesModule` (que fornecia `IHashService`/`IEmailSenderService`) deixa de ser importado neste módulo — nenhum use case aqui ainda depende dele.

- [ ] **Step 8: Rodar os testes e confirmar sucesso**

Run: `cd app && npx jest test/unit/infrastructure/http/controllers/customer test/unit/interface-adapters/customer -v`
Expected: PASS em ambos os arquivos.

- [ ] **Step 9: Build**

Run: `cd app && npx tsc --noEmit -p tsconfig.json`
Expected: sem erros (confirma que nada mais no projeto ainda referencia `ResetCustomerPasswordUseCase` fora do que será removido na Task 8 — se aparecer erro em `auth.module.ts` ou nos e2e de customer-login, é esperado e será resolvido na Task 8).

- [ ] **Step 10: Commit**

```bash
git add app/src/interface-adapters/customer/ app/src/infrastructure/http/controllers/customer/ app/test/unit/interface-adapters/customer/customer.controller.spec.ts app/test/unit/infrastructure/http/controllers/customer/customer.controller.spec.ts
git commit -m "feat(customer): endpoint POST /customers/:id/access e remoção do reset de senha do cliente"
```

---

### Task 6: Resolução de escopo de `customerId` para ordens de serviço

**Files:**
- Modify: `app/src/domain/interfaces/repositories/work-order.repository.interface.ts`
- Modify: `app/src/application/ports/input/work-order/dto/find-all-work-orders.dto.ts`
- Modify: `app/src/infrastructure/persistence/prisma/repositories/prisma-work-order.repository.ts`
- Modify: `app/test/unit/infrastructure/persistence/prisma/repositories/prisma-work-order.repository.spec.ts`
- Modify: `app/src/application/use-cases/work-order/find-work-order-by-id.use-case.ts`
- Modify: `app/test/unit/application/use-cases/work-order/find-work-order-by-id.use-case.spec.ts`
- Create: `app/src/application/ports/input/work-order/find-accessible-customer-ids-for-user.use-case.interface.ts`
- Create: `app/src/application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case.ts`
- Create: `app/test/unit/application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case.spec.ts`

**Interfaces:**
- Consumes: `IUserCustomerAccessRepository` (Task 3).
- Produces: `WorkOrderFilters.customerIdIn?: string[]`; `FindWorkOrderByIdUseCase.execute(id: string, accessibleCustomerIds?: string[]): Promise<WorkOrder>`; `IFindAccessibleCustomerIdsForUserUseCase { execute(userId: string): Promise<string[]> }`.

- [ ] **Step 1: Escrever o teste que falha para o filtro `customerIdIn` no repositório**

Editar `app/test/unit/infrastructure/persistence/prisma/repositories/prisma-work-order.repository.spec.ts`, adicionando (próximo ao teste `should filter by customerId`, dentro de `describe('findAllPaginated')`):

```typescript
    it('should filter by customerIdIn, taking precedence over customerId', async () => {
      const allowedIds = [randomUUID(), randomUUID()];

      await repository.findAllPaginated(
        { page: 1, limit: 10 },
        { customerId: randomUUID(), customerIdIn: allowedIds },
      );

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ customerId: { in: allowedIds } }) }),
      );
    });

    it('should not restrict by customer when customerIdIn is not provided', async () => {
      await repository.findAllPaginated({ page: 1, limit: 10 }, {});

      const call = prisma.workOrder.findMany.mock.calls[0][0];
      expect(call.where.customerId).toBeUndefined();
    });
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/infrastructure/persistence/prisma/repositories/prisma-work-order.repository.spec.ts -t "customerIdIn" -v`
Expected: FAIL — o filtro `customerIdIn` ainda não existe na interface nem no repositório, então o `where.customerId` continua sendo o UUID solto passado em `customerId`, não `{ in: [...] }`.

- [ ] **Step 3: Adicionar `customerIdIn` à interface de filtros e ao DTO da aplicação**

Editar `app/src/domain/interfaces/repositories/work-order.repository.interface.ts`:

```typescript
export interface WorkOrderFilters {
  number?: string;
  customerId?: string;
  customerIdIn?: string[];
  vehicleId?: string;
  assignedUserId?: string;
  status?: WorkOrderStatus;
  statusNotIn?: WorkOrderStatus[];
}
```

Editar `app/src/application/ports/input/work-order/dto/find-all-work-orders.dto.ts`:

```typescript
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export interface FindAllWorkOrdersFilters extends PaginationInput {
  number?: string;
  customerId?: string;
  customerIdIn?: string[];
  vehicleId?: string;
  assignedUserId?: string;
  status?: WorkOrderStatus;
  sort?: string;
}
```

Nenhuma mudança é necessária em `find-all-work-orders-paginated.use-case.ts`: o `...inputFilters` já propaga `customerIdIn` para `WorkOrderFilters` automaticamente.

- [ ] **Step 4: Editar `PrismaWorkOrderRepository.findAllPaginated`**

Trocar a desestruturação e a montagem de `where` em `app/src/infrastructure/persistence/prisma/repositories/prisma-work-order.repository.ts`:

```typescript
  async findAllPaginated(
    pagination: PaginationInput,
    filters: WorkOrderFilters,
    sort?: SortCriterion[],
  ): Promise<PaginatedRepositoryResult<WorkOrder>> {
    const { number, customerId, customerIdIn, vehicleId, assignedUserId, status, statusNotIn } =
      filters;

    const where: Prisma.WorkOrderWhereInput = {};
    if (number) where.number = { contains: number.trim(), mode: 'insensitive' };
    if (customerIdIn?.length) where.customerId = { in: customerIdIn };
    else if (customerId) where.customerId = customerId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (assignedUserId) where.assignedUserId = assignedUserId;
    if (status) where.status = status;
    else if (statusNotIn?.length) where.status = { notIn: statusNotIn };
```

O restante do método não muda.

- [ ] **Step 5: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/infrastructure/persistence/prisma/repositories/prisma-work-order.repository.spec.ts -v`
Expected: PASS (toda a suíte, incluindo os dois novos testes).

- [ ] **Step 6: Escrever o teste que falha para o escopo em `FindWorkOrderByIdUseCase`**

Editar `app/test/unit/application/use-cases/work-order/find-work-order-by-id.use-case.spec.ts`, adicionando:

```typescript
  it('should return the work order when its customerId is within the accessible list', async () => {
    const wo = createMockWorkOrder();
    workOrderRepository.findByIdWithDetails.mockResolvedValue(wo);

    const result = await useCase.execute(wo.id, [wo.customerId, randomUUID()]);

    expect(result).toBe(wo);
  });

  it('should throw ResourceNotFoundException when the work order exists but is outside the accessible list', async () => {
    const wo = createMockWorkOrder();
    workOrderRepository.findByIdWithDetails.mockResolvedValue(wo);

    await expect(useCase.execute(wo.id, [randomUUID()])).rejects.toThrow(ResourceNotFoundException);
  });

  it('should not restrict when accessibleCustomerIds is not provided', async () => {
    const wo = createMockWorkOrder();
    workOrderRepository.findByIdWithDetails.mockResolvedValue(wo);

    const result = await useCase.execute(wo.id);

    expect(result).toBe(wo);
  });
```

E adicionar o import de `randomUUID` no topo do arquivo: `import { randomUUID } from 'node:crypto';`.

- [ ] **Step 7: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/application/use-cases/work-order/find-work-order-by-id.use-case.spec.ts -v`
Expected: FAIL — o segundo teste (fora da lista) passa incorretamente hoje porque `execute` ignora o segundo argumento.

- [ ] **Step 8: Editar `FindWorkOrderByIdUseCase`**

```typescript
import { WorkOrder } from '@domain/entities/work-order.entity';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class FindWorkOrderByIdUseCase {
  constructor(private readonly workOrderRepository: IWorkOrderRepository) {}

  async execute(id: string, accessibleCustomerIds?: string[]): Promise<WorkOrder> {
    const workOrder = await this.workOrderRepository.findByIdWithDetails(id);

    const outOfScope =
      accessibleCustomerIds !== undefined &&
      (!workOrder || !accessibleCustomerIds.includes(workOrder.customerId));

    if (!workOrder || outOfScope) {
      throw new ResourceNotFoundException('Ordem de serviço', id);
    }

    return workOrder;
  }
}
```

- [ ] **Step 9: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/application/use-cases/work-order/find-work-order-by-id.use-case.spec.ts -v`
Expected: PASS (5 testes).

- [ ] **Step 10: Escrever o teste que falha para `FindAccessibleCustomerIdsForUserUseCase`**

Criar `app/test/unit/application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case.spec.ts`:

```typescript
import { randomUUID } from 'node:crypto';
import { FindAccessibleCustomerIdsForUserUseCase } from '@application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

describe('FindAccessibleCustomerIdsForUserUseCase', () => {
  let useCase: FindAccessibleCustomerIdsForUserUseCase;
  let accessRepository: { findByUserId: jest.Mock };

  beforeEach(() => {
    accessRepository = { findByUserId: jest.fn() };
    useCase = new FindAccessibleCustomerIdsForUserUseCase(accessRepository as never);
  });

  it('should return the customerIds linked to the user (SELF and REPRESENTATIVE)', async () => {
    const userId = randomUUID();
    const selfCustomerId = randomUUID();
    const representedCustomerId = randomUUID();

    accessRepository.findByUserId.mockResolvedValue([
      UserCustomerAccess.create({
        userId,
        customerId: selfCustomerId,
        relationship: AccessRelationship.SELF,
      }),
      UserCustomerAccess.create({
        userId,
        customerId: representedCustomerId,
        relationship: AccessRelationship.REPRESENTATIVE,
      }),
    ]);

    const result = await useCase.execute(userId);

    expect(result).toEqual([selfCustomerId, representedCustomerId]);
    expect(accessRepository.findByUserId).toHaveBeenCalledWith(userId);
  });

  it('should return an empty array when the user has no access links', async () => {
    accessRepository.findByUserId.mockResolvedValue([]);

    const result = await useCase.execute(randomUUID());

    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 11: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case.spec.ts -v`
Expected: FAIL — módulo não existe.

- [ ] **Step 12: Criar a interface e o use case**

Criar `app/src/application/ports/input/work-order/find-accessible-customer-ids-for-user.use-case.interface.ts`:

```typescript
export interface IFindAccessibleCustomerIdsForUserUseCase {
  execute(userId: string): Promise<string[]>;
}
```

Criar `app/src/application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case.ts`:

```typescript
import { IUserCustomerAccessRepository } from '@domain/interfaces/repositories/user-customer-access.repository.interface';
import { IFindAccessibleCustomerIdsForUserUseCase } from '@application/ports/input/work-order/find-accessible-customer-ids-for-user.use-case.interface';

export class FindAccessibleCustomerIdsForUserUseCase
  implements IFindAccessibleCustomerIdsForUserUseCase
{
  constructor(private readonly accessRepository: IUserCustomerAccessRepository) {}

  async execute(userId: string): Promise<string[]> {
    const links = await this.accessRepository.findByUserId(userId);
    return links.map((link) => link.customerId);
  }
}
```

- [ ] **Step 13: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/application/use-cases/work-order -v`
Expected: PASS (todas as suítes de `work-order` use cases).

- [ ] **Step 14: Commit**

```bash
git add app/src/domain/interfaces/repositories/work-order.repository.interface.ts app/src/application/ports/input/work-order/dto/find-all-work-orders.dto.ts app/src/application/ports/input/work-order/find-accessible-customer-ids-for-user.use-case.interface.ts app/src/application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case.ts app/src/application/use-cases/work-order/find-work-order-by-id.use-case.ts app/src/infrastructure/persistence/prisma/repositories/prisma-work-order.repository.ts app/test/unit/infrastructure/persistence/prisma/repositories/prisma-work-order.repository.spec.ts app/test/unit/application/use-cases/work-order/find-work-order-by-id.use-case.spec.ts app/test/unit/application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case.spec.ts
git commit -m "feat(work-order): resolver escopo de customerId via UserCustomerAccess, com 404 fora do escopo"
```

---

### Task 7: HTTP — liberar `GET /work-orders` e `GET /work-orders/:id` para `CUSTOMER`

**Files:**
- Modify: `app/src/interface-adapters/work-order/requests/find-all-work-orders-query.ts`
- Modify: `app/src/interface-adapters/work-order/work-order.controller.ts`
- Modify: `app/test/unit/interface-adapters/work-order/work-order.controller.spec.ts`
- Modify: `app/src/infrastructure/http/controllers/work-order/work-order.controller.ts`
- Modify: `app/test/unit/infrastructure/http/controllers/work-order/work-order.controller.spec.ts`
- Modify: `app/src/infrastructure/http/controllers/work-order/work-order.module.ts`

**Interfaces:**
- Consumes: `IFindAccessibleCustomerIdsForUserUseCase` (Task 6).
- Produces: `WorkOrderController.findAll(query, accessibleCustomerIds?)`, `WorkOrderController.findOne(id, accessibleCustomerIds?)` (interface-adapters); rota HTTP aceita `role: CUSTOMER`.

- [ ] **Step 1: Escrever o teste que falha no clean `WorkOrderController`**

Editar `app/test/unit/interface-adapters/work-order/work-order.controller.spec.ts`, adicionando dentro de `describe('findAll')`:

```typescript
    it('should scope by customerIdIn when accessibleCustomerIds is provided', async () => {
      findAllPaginatedUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
      });

      const requestedCustomerId = randomUUID();
      const allowedIds = [randomUUID(), randomUUID()];

      await controller.findAll({ customerId: requestedCustomerId }, allowedIds);

      const call = findAllPaginatedUseCase.execute.mock.calls[0][0];
      expect(call.customerIdIn).toEqual(allowedIds);
    });

    it('should not scope by customerIdIn when accessibleCustomerIds is not provided', async () => {
      findAllPaginatedUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
      });

      await controller.findAll({ status: WorkOrderStatus.RECEIVED });

      const call = findAllPaginatedUseCase.execute.mock.calls[0][0];
      expect(call.customerIdIn).toBeUndefined();
    });
```

E dentro de `describe('findOne')`, adicionar:

```typescript
    it('should forward accessibleCustomerIds to the use case', async () => {
      const workOrder = createMockWorkOrder({ customer, vehicle });
      const allowedIds = [workOrder.customerId];

      findByIdUseCase.execute.mockResolvedValue(workOrder);

      await controller.findOne(workOrder.id, allowedIds);

      expect(findByIdUseCase.execute).toHaveBeenCalledWith(workOrder.id, allowedIds);
    });
```

- [ ] **Step 2: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/interface-adapters/work-order/work-order.controller.spec.ts -v`
Expected: FAIL — `controller.findAll`/`findOne` ainda não aceitam o segundo parâmetro.

- [ ] **Step 3: Editar `FindAllWorkOrdersQuery` e o clean `WorkOrderController`**

Editar `app/src/interface-adapters/work-order/requests/find-all-work-orders-query.ts`:

```typescript
import { PaginationQuery } from '@domain/interfaces/common/pagination.interface';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';

export interface FindAllWorkOrdersQuery extends PaginationQuery {
  number?: string;
  customerId?: string;
  customerIdIn?: string[];
  vehicleId?: string;
  assignedUserId?: string;
  status?: WorkOrderStatus;
  sort?: string;
}
```

Editar `app/src/interface-adapters/work-order/work-order.controller.ts` — só os métodos `findAll` e `findOne` mudam:

```typescript
  async findAll(
    query: FindAllWorkOrdersQuery,
    accessibleCustomerIds?: string[],
  ): Promise<WorkOrderPaginatedResponse> {
    const result = await this.findAllWorkOrdersPaginatedUseCase.execute({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      ...(accessibleCustomerIds !== undefined && { customerIdIn: accessibleCustomerIds }),
    });

    return WorkOrderPresenter.toPaginatedResponse(result);
  }

  async findOne(id: string, accessibleCustomerIds?: string[]): Promise<WorkOrderDataResponse> {
    const workOrder = await this.findWorkOrderByIdUseCase.execute(id, accessibleCustomerIds);
    return WorkOrderPresenter.toDataResponse(workOrder);
  }
```

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/interface-adapters/work-order/work-order.controller.spec.ts -v`
Expected: PASS.

- [ ] **Step 5: Escrever o teste que falha no HTTP `WorkOrderController`**

Editar `app/test/unit/infrastructure/http/controllers/work-order/work-order.controller.spec.ts`:

Adicionar ao `beforeEach` uma segunda dependência mockada e trocar a construção do `httpController`:

```typescript
  let findAccessibleCustomerIdsForUserUseCase: { execute: jest.Mock };

  beforeEach(() => {
    cleanController = new WorkOrderCleanController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    findAccessibleCustomerIdsForUserUseCase = { execute: jest.fn() };
    httpController = new WorkOrderController(cleanController, findAccessibleCustomerIdsForUserUseCase as never);
  });
```

E substituir os describes `findAll`/`findOne` por:

```typescript
  describe('findAll', () => {
    it('should pass the query straight to the clean controller for staff roles', async () => {
      const query: FindAllWorkOrdersPaginatedQueryDto = { page: 1, limit: 10 };

      const response = WorkOrderPresenter.toPaginatedResponse({
        items: [createMockWorkOrder({ customer, vehicle })],
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      });

      jest.spyOn(cleanController, 'findAll').mockResolvedValue(response);

      const result = await httpController.findAll(query, currentUser);

      expect(result).toBe(response);
      expect(cleanController.findAll).toHaveBeenCalledWith(query, undefined);
      expect(findAccessibleCustomerIdsForUserUseCase.execute).not.toHaveBeenCalled();
    });

    it('should resolve and forward accessibleCustomerIds for a CUSTOMER caller, ignoring any customerId filter', async () => {
      const customerUser: AuthenticatedUser = {
        sub: randomUUID(),
        email: 'cliente@email.com',
        role: UserRole.CUSTOMER,
      };
      const allowedIds = [randomUUID(), randomUUID()];
      const query: FindAllWorkOrdersPaginatedQueryDto = { customerId: randomUUID() };

      const response = WorkOrderPresenter.toPaginatedResponse({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
      });

      findAccessibleCustomerIdsForUserUseCase.execute.mockResolvedValue(allowedIds);
      jest.spyOn(cleanController, 'findAll').mockResolvedValue(response);

      const result = await httpController.findAll(query, customerUser);

      expect(result).toBe(response);
      expect(findAccessibleCustomerIdsForUserUseCase.execute).toHaveBeenCalledWith(customerUser.sub);
      expect(cleanController.findAll).toHaveBeenCalledWith(query, allowedIds);
    });
  });

  describe('findOne', () => {
    it('should delegate to the clean controller without scoping for staff roles', async () => {
      const workOrder = createMockWorkOrder({ customer, vehicle });
      const response = WorkOrderPresenter.toDataResponse(workOrder);

      jest.spyOn(cleanController, 'findOne').mockResolvedValue(response);

      const result = await httpController.findOne(workOrder.id, currentUser);

      expect(result).toBe(response);
      expect(cleanController.findOne).toHaveBeenCalledWith(workOrder.id, undefined);
    });

    it('should resolve and forward accessibleCustomerIds for a CUSTOMER caller', async () => {
      const customerUser: AuthenticatedUser = {
        sub: randomUUID(),
        email: 'cliente@email.com',
        role: UserRole.CUSTOMER,
      };
      const workOrder = createMockWorkOrder({ customer, vehicle });
      const allowedIds = [workOrder.customerId];
      const response = WorkOrderPresenter.toDataResponse(workOrder);

      findAccessibleCustomerIdsForUserUseCase.execute.mockResolvedValue(allowedIds);
      jest.spyOn(cleanController, 'findOne').mockResolvedValue(response);

      const result = await httpController.findOne(workOrder.id, customerUser);

      expect(result).toBe(response);
      expect(cleanController.findOne).toHaveBeenCalledWith(workOrder.id, allowedIds);
    });
  });
```

Note: os demais describes (`create`, `update`, `updateStatus`, etc.) não mudam.

- [ ] **Step 6: Rodar o teste e confirmar falha**

Run: `cd app && npx jest test/unit/infrastructure/http/controllers/work-order/work-order.controller.spec.ts -v`
Expected: FAIL — `httpController.findAll`/`findOne` ainda não aceitam `currentUser`, e o construtor ainda recebe só 1 argumento.

- [ ] **Step 7: Editar o HTTP `WorkOrderController` e `work-order.module.ts`**

Editar `app/src/infrastructure/http/controllers/work-order/work-order.controller.ts` — adicionar o import da interface e do enum de role (já importado), trocar o construtor e os métodos `findAll`/`findOne`:

```typescript
import { IFindAccessibleCustomerIdsForUserUseCase } from '@application/ports/input/work-order/find-accessible-customer-ids-for-user.use-case.interface';
```

```typescript
export class WorkOrderController {
  constructor(
    private readonly controller: WorkOrderCleanController,
    @Inject('IFindAccessibleCustomerIdsForUserUseCase')
    private readonly findAccessibleCustomerIdsForUserUseCase: IFindAccessibleCustomerIdsForUserUseCase,
  ) {}
```

(Adicionar `Inject` ao import de `@nestjs/common` no topo do arquivo.)

```typescript
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Listar Ordens de Serviço paginado' })
  @ApiOkResponse({ type: WorkOrderPaginatedResponseDto })
  async findAll(
    @Query() query: FindAllWorkOrdersPaginatedQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkOrderPaginatedResponseDto> {
    const accessibleCustomerIds = await this.resolveAccessibleCustomerIds(user);
    return this.controller.findAll(query, accessibleCustomerIds);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT, UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Buscar Ordem de Serviço por ID' })
  @ApiOkResponse({ type: WorkOrderDataResponseDto })
  @ApiNotFoundResponse()
  @ApiParam({ name: 'id', format: 'uuid' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkOrderDataResponseDto> {
    const accessibleCustomerIds = await this.resolveAccessibleCustomerIds(user);
    return this.controller.findOne(id, accessibleCustomerIds);
  }

  private async resolveAccessibleCustomerIds(
    user: AuthenticatedUser,
  ): Promise<string[] | undefined> {
    if (user.role !== UserRole.CUSTOMER) {
      return undefined;
    }

    return this.findAccessibleCustomerIdsForUserUseCase.execute(user.sub);
  }
```

Note: os demais métodos do controller (`create`, `update`, `updateStatus`, `updateServiceStatus`, `getStatusHistory`, `findQuotes`) e seus decorators `@Roles` não mudam.

Editar `app/src/infrastructure/http/controllers/work-order/work-order.module.ts` — adicionar o novo provider e o novo import, e ajustar o `useFactory`/`inject` do `WorkOrderController` (agora ele próprio é resolvido implicitamente pelo Nest a partir do `@Inject` no construtor, então basta declará-lo em `controllers` normalmente; não precisa de `useFactory` para ele, só para `WorkOrderCleanController`):

```typescript
import { Module } from '@nestjs/common';

import { CreateWorkOrderUseCase } from '@application/use-cases/work-order/create-work-order.use-case';
import { FindWorkOrderByIdUseCase } from '@application/use-cases/work-order/find-work-order-by-id.use-case';
import { FindAllWorkOrdersPaginatedUseCase } from '@application/use-cases/work-order/find-all-work-orders-paginated.use-case';
import { UpdateWorkOrderUseCase } from '@application/use-cases/work-order/update-work-order.use-case';
import { UpdateWorkOrderStatusUseCase } from '@application/use-cases/work-order/update-work-order-status.use-case';
import { UpdateWorkOrderServiceStatusUseCase } from '@application/use-cases/work-order/update-work-order-service-status.use-case';
import { FindWorkOrderStatusHistoryUseCase } from '@application/use-cases/work-order/find-work-order-status-history.use-case';
import { FindWorkOrderQuotesUseCase } from '@application/use-cases/quote/find-work-order-quotes.use-case';
import { FindAccessibleCustomerIdsForUserUseCase } from '@application/use-cases/work-order/find-accessible-customer-ids-for-user.use-case';

import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IStatusHistoryRepository } from '@domain/interfaces/repositories/status-history.repository.interface';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { IUserCustomerAccessRepository } from '@domain/interfaces/repositories/user-customer-access.repository.interface';

import { WorkOrderController as WorkOrderCleanController } from '@interface-adapters/work-order/work-order.controller';
import { WorkOrderController } from './work-order.controller';

@Module({
  controllers: [WorkOrderController],
  providers: [
    {
      provide: WorkOrderCleanController,
      useFactory: (
        unitOfWork: IUnitOfWork,
        workOrderRepository: IWorkOrderRepository,
        userRepository: IUserRepository,
        statusHistoryRepository: IStatusHistoryRepository,
        quoteRepository: IQuoteRepository,
      ) =>
        new WorkOrderCleanController(
          new CreateWorkOrderUseCase(unitOfWork),
          new FindWorkOrderByIdUseCase(workOrderRepository),
          new FindAllWorkOrdersPaginatedUseCase(workOrderRepository),
          new UpdateWorkOrderUseCase(workOrderRepository, userRepository),
          new UpdateWorkOrderStatusUseCase(unitOfWork),
          new UpdateWorkOrderServiceStatusUseCase(unitOfWork),
          new FindWorkOrderStatusHistoryUseCase(statusHistoryRepository, workOrderRepository),
          new FindWorkOrderQuotesUseCase(quoteRepository, workOrderRepository),
        ),
      inject: [
        'IUnitOfWork',
        'IWorkOrderRepository',
        'IUserRepository',
        'IStatusHistoryRepository',
        'IQuoteRepository',
      ],
    },
    {
      provide: 'IFindAccessibleCustomerIdsForUserUseCase',
      useFactory: (accessRepository: IUserCustomerAccessRepository) =>
        new FindAccessibleCustomerIdsForUserUseCase(accessRepository),
      inject: ['IUserCustomerAccessRepository'],
    },
  ],
})
export class WorkOrderModule {}
```

- [ ] **Step 8: Rodar o teste e confirmar sucesso**

Run: `cd app && npx jest test/unit/infrastructure/http/controllers/work-order/work-order.controller.spec.ts test/unit/interface-adapters/work-order/work-order.controller.spec.ts -v`
Expected: PASS em ambos.

- [ ] **Step 9: Build**

Run: `cd app && npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 10: Commit**

```bash
git add app/src/interface-adapters/work-order/ app/src/infrastructure/http/controllers/work-order/ app/test/unit/interface-adapters/work-order/work-order.controller.spec.ts app/test/unit/infrastructure/http/controllers/work-order/work-order.controller.spec.ts
git commit -m "feat(work-order): liberar GET /work-orders e GET /work-orders/:id para a role CUSTOMER"
```

---

### Task 8: Remoção completa da infraestrutura de autenticação dedicada a `Customer`

**Files:**
- Delete: ver lista completa no Step 1.
- Modify: `app/src/interface-adapters/auth/auth.controller.ts`, `app/test/unit/interface-adapters/auth/auth.controller.spec.ts`, `app/src/infrastructure/http/controllers/auth/auth.controller.ts`, `app/test/unit/infrastructure/http/controllers/auth/auth.controller.spec.ts`, `app/src/infrastructure/http/controllers/auth/auth.module.ts`, `app/src/infrastructure/http/controllers/quote/quote.module.ts`, `app/src/application/ports/output/token.service.interface.ts`, `app/src/config/swagger.config.ts`, `app/.env.example`, `app/docker-compose.yml`, `app/test/helpers/test-app.helper.ts`.

**Interfaces:** nenhuma nova — esta task só remove.

- [ ] **Step 1: Remover todos os arquivos do domínio de autenticação de `Customer`**

Run:
```bash
cd app
rm -f \
  src/application/ports/input/auth/authenticate-customer.use-case.interface.ts \
  src/application/ports/input/auth/dto/authenticate-customer.dto.ts \
  src/application/ports/input/auth/dto/change-own-customer-password.dto.ts \
  src/application/ports/input/auth/dto/refresh-customer-token.dto.ts \
  src/application/ports/input/auth/refresh-customer-token.use-case.interface.ts \
  src/application/use-cases/auth/authenticate-customer.use-case.ts \
  src/application/use-cases/auth/change-own-customer-password.use-case.ts \
  src/application/use-cases/auth/refresh-customer-token.use-case.ts \
  src/application/use-cases/customer/reset-customer-password.use-case.ts \
  src/application/ports/input/quote/dto/authenticated-quote-decision.dto.ts \
  src/application/ports/input/quote/find-pending-quotes-for-customer.use-case.interface.ts \
  src/application/use-cases/quote/authenticated-quote-decision.use-case.ts \
  src/application/use-cases/quote/find-pending-quotes-for-customer.use-case.ts \
  src/infrastructure/http/controllers/auth/dto/requests/change-own-customer-password-request.dto.ts \
  src/infrastructure/http/controllers/auth/dto/requests/login-customer-request.dto.ts \
  src/infrastructure/http/controllers/auth/dto/requests/refresh-customer-token-request.dto.ts \
  src/infrastructure/http/controllers/auth/dto/responses/auth-customer-response.dto.ts \
  src/infrastructure/http/guards/jwt-customer-auth.guard.ts \
  src/infrastructure/http/strategies/jwt-customer.strategy.ts \
  src/infrastructure/http/decorators/current-customer.decorator.ts \
  src/infrastructure/http/controllers/quote/customer-quote.controller.ts \
  src/interface-adapters/auth/requests/login-customer-request.ts \
  src/interface-adapters/auth/requests/refresh-customer-token-request.ts \
  src/interface-adapters/auth/responses/auth-customer.response.ts \
  src/interface-adapters/quote/customer-quote.controller.ts \
  test/unit/application/use-cases/auth/authenticate-customer.use-case.spec.ts \
  test/unit/application/use-cases/auth/change-own-customer-password.use-case.spec.ts \
  test/unit/application/use-cases/auth/refresh-customer-token.use-case.spec.ts \
  test/unit/application/use-cases/customer/reset-customer-password.use-case.spec.ts \
  test/unit/application/use-cases/quote/authenticated-quote-decision.use-case.spec.ts \
  test/unit/application/use-cases/quote/find-pending-quotes-for-customer.use-case.spec.ts \
  test/e2e/customer-auth.e2e-spec.ts \
  test/e2e/customer-password.e2e-spec.ts \
  test/e2e/quote-customer-decision.e2e-spec.ts \
  test/helpers/customer-auth.helper.ts
```

- [ ] **Step 2: Simplificar o clean `AuthController` e seu spec**

Substituir `app/src/interface-adapters/auth/auth.controller.ts` por:

```typescript
import { IAuthenticateUserUseCase } from '@application/ports/input/auth/authenticate-user.use-case.interface';
import { IGetCurrentUserUseCase } from '@application/ports/input/auth/get-current-user.use-case.interface';
import { IRefreshTokenUseCase } from '@application/ports/input/auth/refresh-token.use-case.interface';

import { LoginRequest } from './requests/login-request';
import { RefreshTokenRequest } from './requests/refresh-token-request';

import { AuthPresenter } from './auth.presenter';
import { AuthDataResponse, MeDataResponse } from './responses/auth.response';

export class AuthController {
  constructor(
    private readonly authenticateUseCase: IAuthenticateUserUseCase,
    private readonly getCurrentUserUseCase: IGetCurrentUserUseCase,
    private readonly refreshTokenUseCase: IRefreshTokenUseCase,
  ) {}

  async login(input: LoginRequest): Promise<AuthDataResponse> {
    const result = await this.authenticateUseCase.execute(input);
    return AuthPresenter.toAuthDataResponse(result);
  }

  async refresh(input: RefreshTokenRequest): Promise<AuthDataResponse> {
    const result = await this.refreshTokenUseCase.execute(input);
    return AuthPresenter.toAuthDataResponse(result);
  }

  async me(userId: string): Promise<MeDataResponse> {
    const result = await this.getCurrentUserUseCase.execute(userId);
    return AuthPresenter.toMeDataResponse(result);
  }
}
```

Substituir `app/test/unit/interface-adapters/auth/auth.controller.spec.ts` por:

```typescript
import { randomUUID } from 'node:crypto';

import { AuthController } from '@interface-adapters/auth/auth.controller';
import { AuthPresenter } from '@interface-adapters/auth/auth.presenter';

import { LoginRequest } from '@interface-adapters/auth/requests/login-request';
import { RefreshTokenRequest } from '@interface-adapters/auth/requests/refresh-token-request';

import { IAuthenticateUserUseCase } from '@application/ports/input/auth/authenticate-user.use-case.interface';
import { IGetCurrentUserUseCase } from '@application/ports/input/auth/get-current-user.use-case.interface';
import { IRefreshTokenUseCase } from '@application/ports/input/auth/refresh-token.use-case.interface';

import { AuthenticateUserOutputDto } from '@application/ports/input/auth/dto/authenticate-user.dto';
import { RefreshTokenOutputDto } from '@application/ports/input/auth/dto/refresh-token.dto';
import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';

import { UserRole } from '@domain/enums/user-role.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authenticateUseCase: jest.Mocked<IAuthenticateUserUseCase>;
  let getCurrentUserUseCase: jest.Mocked<IGetCurrentUserUseCase>;
  let refreshTokenUseCase: jest.Mocked<IRefreshTokenUseCase>;

  beforeEach(() => {
    authenticateUseCase = { execute: jest.fn() };
    getCurrentUserUseCase = { execute: jest.fn() };
    refreshTokenUseCase = { execute: jest.fn() };

    controller = new AuthController(
      authenticateUseCase,
      getCurrentUserUseCase,
      refreshTokenUseCase,
    );
  });

  describe('login', () => {
    it('should authenticate the user and return tokens wrapped in data', async () => {
      const request: LoginRequest = {
        identifier: 'john.doe@example.com',
        password: 'SecurePass123!',
      };

      const authResult: AuthenticateUserOutputDto = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh-token-uuid',
        user: {
          id: randomUUID(),
          name: 'John Doe',
          email: 'john.doe@example.com',
          document: '12345678909',
          role: UserRole.ATTENDANT,
        },
      };

      authenticateUseCase.execute.mockResolvedValue(authResult);

      const result = await controller.login(request);

      expect(result).toEqual(AuthPresenter.toAuthDataResponse(authResult));
      expect(authenticateUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and return them wrapped in data', async () => {
      const request: RefreshTokenRequest = { refreshToken: 'valid-refresh-token' };

      const refreshResult: RefreshTokenOutputDto = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: randomUUID(),
          name: 'John Doe',
          email: 'john.doe@example.com',
          document: '12345678909',
          role: UserRole.ATTENDANT,
        },
      };

      refreshTokenUseCase.execute.mockResolvedValue(refreshResult);

      const result = await controller.refresh(request);

      expect(result).toEqual(AuthPresenter.toAuthDataResponse(refreshResult));
      expect(refreshTokenUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('me', () => {
    it('should return the current user data wrapped in data', async () => {
      const userId = randomUUID();

      const currentUser: GetCurrentUserOutputDto = {
        id: userId,
        name: 'John Doe',
        email: 'john.doe@example.com',
        document: '12345678909',
        role: UserRole.ATTENDANT,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      getCurrentUserUseCase.execute.mockResolvedValue(currentUser);

      const result = await controller.me(userId);

      expect(result).toEqual(AuthPresenter.toMeDataResponse(currentUser));
      expect(getCurrentUserUseCase.execute).toHaveBeenCalledWith(userId);
    });
  });
});
```

- [ ] **Step 3: Simplificar o HTTP `AuthController` e seu spec**

Substituir `app/src/infrastructure/http/controllers/auth/auth.controller.ts` por:

```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '@infrastructure/http/decorators/current-user.decorator';
import { JwtAuthGuard } from '@infrastructure/http/guards/jwt-auth.guard';

import { AuthController as AuthCleanController } from '@interface-adapters/auth/auth.controller';

import { AuthDataResponseDto } from './dto/responses/auth-response.dto';
import { MeDataResponseDto } from './dto/responses/me-response.dto';
import { LoginRequestDto } from './dto/requests/login-request.dto';
import { RefreshTokenRequestDto } from './dto/requests/refresh-token-request.dto';

@ApiTags('Autenticação')
@ApiProduces('application/json')
@ApiInternalServerErrorResponse({ description: 'Erro interno do servidor' })
@Controller('auth')
export class AuthController {
  constructor(private readonly controller: AuthCleanController) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário' })
  @ApiOkResponse({ type: AuthDataResponseDto, description: 'Login realizado com sucesso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  login(@Body() request: LoginRequestDto): Promise<AuthDataResponseDto> {
    return this.controller.login(request);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens com refresh token' })
  @ApiOkResponse({ type: AuthDataResponseDto, description: 'Tokens renovados com sucesso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido ou expirado' })
  refresh(@Body() request: RefreshTokenRequestDto): Promise<AuthDataResponseDto> {
    return this.controller.refresh(request);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obter dados do usuário autenticado' })
  @ApiOkResponse({ type: MeDataResponseDto, description: 'Dados do usuário' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeDataResponseDto> {
    return this.controller.me(user.sub);
  }
}
```

Substituir `app/test/unit/infrastructure/http/controllers/auth/auth.controller.spec.ts` por:

```typescript
import { randomUUID } from 'node:crypto';

import { AuthController } from '@infrastructure/http/controllers/auth/auth.controller';

import { AuthController as AuthCleanController } from '@interface-adapters/auth/auth.controller';
import { AuthPresenter } from '@interface-adapters/auth/auth.presenter';

import { LoginRequestDto } from '@infrastructure/http/controllers/auth/dto/requests/login-request.dto';
import { RefreshTokenRequestDto } from '@infrastructure/http/controllers/auth/dto/requests/refresh-token-request.dto';
import { AuthenticatedUser } from '@infrastructure/http/decorators/current-user.decorator';

import { AuthenticateUserOutputDto } from '@application/ports/input/auth/dto/authenticate-user.dto';
import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';

import { UserRole } from '@domain/enums/user-role.enum';

describe('AuthController', () => {
  let httpController: AuthController;
  let cleanController: AuthCleanController;

  beforeEach(() => {
    cleanController = new AuthCleanController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new AuthController(cleanController);
  });

  describe('login', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const dto: LoginRequestDto = { identifier: 'joao@email.com', password: 'SecurePass123!' };

      const authResult: AuthenticateUserOutputDto = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: randomUUID(),
          name: 'João',
          email: 'joao@email.com',
          document: '12345678909',
          role: UserRole.ATTENDANT,
        },
      };

      const response = AuthPresenter.toAuthDataResponse(authResult);

      jest.spyOn(cleanController, 'login').mockResolvedValue(response);

      const result = await httpController.login(dto);

      expect(result).toBe(response);
      expect(cleanController.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const dto: RefreshTokenRequestDto = { refreshToken: 'valid-refresh-token' };

      const refreshResult: AuthenticateUserOutputDto = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: randomUUID(),
          name: 'João',
          email: 'joao@email.com',
          document: '12345678909',
          role: UserRole.ATTENDANT,
        },
      };

      const response = AuthPresenter.toAuthDataResponse(refreshResult);

      jest.spyOn(cleanController, 'refresh').mockResolvedValue(response);

      const result = await httpController.refresh(dto);

      expect(result).toBe(response);
      expect(cleanController.refresh).toHaveBeenCalledWith(dto);
    });
  });

  describe('me', () => {
    it('should delegate to the clean controller with the current user id', async () => {
      const authenticatedUser: AuthenticatedUser = {
        sub: randomUUID(),
        email: 'joao@email.com',
        role: UserRole.ATTENDANT,
      };

      const currentUser: GetCurrentUserOutputDto = {
        id: authenticatedUser.sub,
        name: 'João',
        email: authenticatedUser.email,
        document: '12345678909',
        role: authenticatedUser.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = AuthPresenter.toMeDataResponse(currentUser);

      jest.spyOn(cleanController, 'me').mockResolvedValue(response);

      const result = await httpController.me(authenticatedUser);

      expect(result).toBe(response);
      expect(cleanController.me).toHaveBeenCalledWith(authenticatedUser.sub);
    });
  });
});
```

- [ ] **Step 4: Simplificar `auth.module.ts`**

Substituir `app/src/infrastructure/http/controllers/auth/auth.module.ts` por:

```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AuthenticateUserUseCase } from '@application/use-cases/auth/authenticate-user.use-case';
import { GetCurrentUserUseCase } from '@application/use-cases/auth/get-current-user.use-case';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { JwtStrategy } from '@infrastructure/http/strategies/jwt.strategy';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ITokenService } from '@application/ports/output/token.service.interface';

import { AuthController as AuthCleanController } from '@interface-adapters/auth/auth.controller';
import { AuthController } from './auth.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), InfrastructureServicesModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AuthCleanController,
      useFactory: (
        userRepository: IUserRepository,
        hashService: IHashService,
        tokenService: ITokenService,
      ) =>
        new AuthCleanController(
          new AuthenticateUserUseCase(userRepository, hashService, tokenService),
          new GetCurrentUserUseCase(userRepository),
          new RefreshTokenUseCase(userRepository, tokenService),
        ),
      inject: ['IUserRepository', 'IHashService', 'ITokenService'],
    },
    JwtStrategy,
  ],
  exports: [JwtStrategy],
})
export class AuthModule {}
```

- [ ] **Step 5: Simplificar `quote.module.ts`**

Substituir `app/src/infrastructure/http/controllers/quote/quote.module.ts` por (remove `CustomerQuoteController`/`CustomerQuoteCleanController` e os use cases exclusivos dele):

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateQuoteUseCase } from '@application/use-cases/quote/create-quote.use-case';
import { FindQuoteByIdUseCase } from '@application/use-cases/quote/find-quote-by-id.use-case';
import { AddQuoteServiceUseCase } from '@application/use-cases/quote/add-quote-service.use-case';
import { RemoveQuoteServiceUseCase } from '@application/use-cases/quote/remove-quote-service.use-case';
import { AddQuotePartSupplyUseCase } from '@application/use-cases/quote/add-quote-part-supply.use-case';
import { RemoveQuotePartSupplyUseCase } from '@application/use-cases/quote/remove-quote-part-supply.use-case';
import { UpdateQuoteServiceQuantityUseCase } from '@application/use-cases/quote/update-quote-service-quantity.use-case';
import { UpdateQuotePartSupplyQuantityUseCase } from '@application/use-cases/quote/update-quote-part-supply-quantity.use-case';
import { SubmitQuoteUseCase } from '@application/use-cases/quote/submit-quote.use-case';
import { ApproveQuoteUseCase } from '@application/use-cases/quote/approve-quote.use-case';
import { RejectQuoteUseCase } from '@application/use-cases/quote/reject-quote.use-case';
import { UpdateQuoteStatusUseCase } from '@application/use-cases/quote/update-quote-status.use-case';
import { EmailDecisionQuoteUseCase } from '@application/use-cases/quote/email-decision-quote.use-case';
import { FindAllQuotesPaginatedUseCase } from '@application/use-cases/quote/find-all-quotes-paginated.use-case';
import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';

import { ITokenService } from '@application/ports/output/token.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';

import { QuoteController as QuoteCleanController } from '@interface-adapters/quote/quote.controller';
import { QuoteController } from './quote.controller';

@Module({
  imports: [InfrastructureServicesModule],
  controllers: [QuoteController],
  providers: [
    {
      provide: QuoteCleanController,
      useFactory: (
        unitOfWork: IUnitOfWork,
        quoteRepository: IQuoteRepository,
        emailSender: IEmailSenderService,
        tokenService: ITokenService,
        configService: ConfigService,
      ) => {
        const quoteDecisionTokenSecret = configService.getOrThrow<string>(
          'QUOTE_DECISION_TOKEN_SECRET',
        );
        const quoteDecisionBaseUrl =
          configService.get<string>('QUOTE_DECISION_BASE_URL') ??
          `http://localhost:${configService.get<string>('PORT') ?? '3000'}/api`;

        const approveQuoteUseCase = new ApproveQuoteUseCase(unitOfWork);
        const rejectQuoteUseCase = new RejectQuoteUseCase(unitOfWork);

        return new QuoteCleanController(
          new CreateQuoteUseCase(unitOfWork),
          new FindQuoteByIdUseCase(quoteRepository),
          new AddQuoteServiceUseCase(unitOfWork),
          new RemoveQuoteServiceUseCase(unitOfWork),
          new AddQuotePartSupplyUseCase(unitOfWork),
          new RemoveQuotePartSupplyUseCase(unitOfWork),
          new UpdateQuoteServiceQuantityUseCase(unitOfWork),
          new UpdateQuotePartSupplyQuantityUseCase(unitOfWork),
          new SubmitQuoteUseCase(
            unitOfWork,
            emailSender,
            tokenService,
            quoteDecisionTokenSecret,
            quoteDecisionBaseUrl,
          ),
          new EmailDecisionQuoteUseCase(
            tokenService,
            approveQuoteUseCase,
            rejectQuoteUseCase,
            quoteDecisionTokenSecret,
          ),
          new UpdateQuoteStatusUseCase(approveQuoteUseCase, rejectQuoteUseCase),
          new FindAllQuotesPaginatedUseCase(quoteRepository),
        );
      },
      inject: [
        'IUnitOfWork',
        'IQuoteRepository',
        'IEmailSenderService',
        'ITokenService',
        ConfigService,
      ],
    },
  ],
})
export class QuoteModule {}
```

- [ ] **Step 6: Remover `CustomerTokenPayload` de `token.service.interface.ts`**

Editar `app/src/application/ports/output/token.service.interface.ts`, removendo o bloco final:

```typescript
export interface CustomerTokenPayload {
  sub: string;
  email: string;
  type: 'customer';
}
```

O restante do arquivo (`TokenPayload`, `TokenPair`, `ITokenService`) não muda.

- [ ] **Step 7: Remover o bearer scheme de cliente do Swagger**

Editar `app/src/config/swagger.config.ts`, removendo o segundo bloco `.addBearerAuth(...)` (o de `'customer-access-token'`):

```typescript
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Oficina Mecânica API')
    .setDescription(
      'Sistema Integrado de Atendimento e Execução de Serviços — ' +
        'Gestão de ordens de serviço, clientes, veículos, peças e serviços.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Informe o token JWT',
      },
      'access-token',
    )
    .build();
  // ... resto do arquivo (SwaggerModule.createDocument/setup) permanece igual
```

- [ ] **Step 8: Remover as variáveis `CUSTOMER_JWT_*`**

Editar `app/.env.example`, removendo as 4 linhas:
```
CUSTOMER_JWT_SECRET=your-customer-secret-key-here
CUSTOMER_JWT_EXPIRATION=15m
CUSTOMER_JWT_REFRESH_SECRET=your-customer-refresh-secret-key-here
CUSTOMER_JWT_REFRESH_EXPIRATION=7d
```

Editar `app/docker-compose.yml`, removendo as 4 linhas correspondentes do serviço `api`:
```yaml
      CUSTOMER_JWT_SECRET: ${CUSTOMER_JWT_SECRET:-change-me-customer-in-production}
      CUSTOMER_JWT_EXPIRATION: ${CUSTOMER_JWT_EXPIRATION:-15m}
      CUSTOMER_JWT_REFRESH_SECRET: ${CUSTOMER_JWT_REFRESH_SECRET:-change-me-customer-refresh-in-production}
      CUSTOMER_JWT_REFRESH_EXPIRATION: ${CUSTOMER_JWT_REFRESH_EXPIRATION:-7d}
```

Editar `app/test/helpers/test-app.helper.ts`, removendo as 4 linhas:
```typescript
  process.env.CUSTOMER_JWT_SECRET = 'test-customer-jwt-secret-key-for-e2e';
  process.env.CUSTOMER_JWT_EXPIRATION = '15m';
  process.env.CUSTOMER_JWT_REFRESH_SECRET = 'test-customer-jwt-refresh-secret-key-for-e2e';
  process.env.CUSTOMER_JWT_REFRESH_EXPIRATION = '7d';
```

- [ ] **Step 9: Rodar toda a suíte unitária, build e lint**

Run: `cd app && npx jest test/unit 2>&1 | tail -40`
Expected: PASS em todas as suítes (nenhum arquivo remanescente referencia os símbolos removidos).

Run: `cd app && npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

Run: `cd app && npx eslint "src/**/*.ts" "test/**/*.ts" --max-warnings=0`
Expected: sem erros/warnings.

Se algum erro apontar para um arquivo fora desta task que ainda importa algo removido (ex.: um teste e2e esquecido), localize com:
```bash
grep -rn "CustomerTokenPayload\|JwtCustomerStrategy\|JwtCustomerAuthGuard\|CurrentCustomer\|AuthenticateCustomerUseCase\|RefreshCustomerTokenUseCase\|ChangeOwnCustomerPasswordUseCase\|ResetCustomerPasswordUseCase\|CustomerQuoteController\|AuthenticatedQuoteDecisionUseCase\|FindPendingQuotesForCustomerUseCase\|CUSTOMER_JWT" app/src app/test
```
Expected: nenhum resultado.

- [ ] **Step 10: Commit**

```bash
git add -A
git status --short
```

Confira que a lista de arquivos removidos/modificados corresponde exatamente ao que esta task descreve (nenhum arquivo de outra task deve aparecer aqui).

```bash
git commit -m "refactor(auth): remover toda a infraestrutura de autenticação dedicada a Customer"
```

---

### Task 9: Seeds — `João da Silva` (SELF) e representante de `Oficina Parceira LTDA` (REPRESENTATIVE)

**Files:**
- Modify: `app/prisma/seeds/user.seed.ts`
- Create: `app/prisma/seeds/user-customer-access.seed.ts`
- Modify: `app/prisma/seed.ts`

**Interfaces:**
- Consumes: `customerIds: Record<string, string>` já retornado por `seedCustomers` (chave = `document`).
- Produces: `seedUsers` passa a retornar `Record<string, string>` (chave = `document`); `seedUserCustomerAccess(prisma, userIds, customerIds): Promise<void>`.

- [ ] **Step 1: Editar `app/prisma/seeds/user.seed.ts`**

Adicionar os dois novos usuários `CUSTOMER` ao array `users`, e fazer `seedUsers` retornar os IDs por documento:

```typescript
/* eslint-disable no-console */
import { PrismaClient, UserRole } from '../generated/client';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const DEFAULT_PASSWORD = 'Tech@2026';

interface UserSeed {
  name: string;
  email: string;
  document: string;
  role: UserRole;
}

const users: UserSeed[] = [
  {
    name: 'Guilherme da Rocha Salvador',
    email: 'guilhermedarochasalvador@gmail.com',
    document: '48216539070',
    role: UserRole.ADMIN,
  },
  {
    name: 'Lucas Almeida da Silva',
    email: 'lucas.almeida-silva@hotmail.com',
    document: '60729384187',
    role: UserRole.ADMIN,
  },
  {
    name: 'Ramoon Lincoln Barros Camacho',
    email: 'ramooncamacho@hotmail.com',
    document: '73941825682',
    role: UserRole.ADMIN,
  },
  {
    name: 'Renan Santana Camacho',
    email: 'camacho.renan@gmail.com',
    document: '85402763135',
    role: UserRole.ADMIN,
  },
  {
    name: 'João da Silva',
    email: 'joao.silva.cliente@oficina.com',
    document: '12345678909',
    role: UserRole.CUSTOMER,
  },
  {
    name: 'Carlos Mendes',
    email: 'carlos.mendes@oficinarceira.com.br',
    document: '39174062840',
    role: UserRole.CUSTOMER,
  },
];

export async function seedUsers(prisma: PrismaClient): Promise<Record<string, string>> {
  console.log('🌱 Seeding users...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  const ids: Record<string, string> = {};

  for (const user of users) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        document: user.document,
        role: user.role,
      },
      create: {
        name: user.name,
        email: user.email,
        document: user.document,
        passwordHash,
        role: user.role,
        isActive: true,
      },
    });

    ids[user.document] = record.id;
    console.log(`  ✔ ${user.name} (${user.email})`);
  }

  console.log(`✅ ${users.length} users seeded (senha padrão: ${DEFAULT_PASSWORD})`);

  return ids;
}
```

Nota: `12345678909` é exatamente o `document` de `João da Silva` em `customer.seed.ts` (necessário para o vínculo `SELF` — os documentos precisam coincidir). `39174062840` é um CPF novo e válido (verificado com o mesmo algoritmo do `DocumentValidator`), sem colisão com nenhum outro documento já usado nos seeds.

- [ ] **Step 2: Criar `app/prisma/seeds/user-customer-access.seed.ts`**

```typescript
/* eslint-disable no-console */
import { PrismaClient, AccessRelationship } from '../generated/client';

interface AccessLinkSeed {
  userDocument: string;
  customerDocument: string;
  relationship: AccessRelationship;
}

const accessLinks: AccessLinkSeed[] = [
  {
    userDocument: '12345678909',
    customerDocument: '12345678909',
    relationship: AccessRelationship.SELF,
  },
  {
    userDocument: '39174062840',
    customerDocument: '12345678000195',
    relationship: AccessRelationship.REPRESENTATIVE,
  },
];

export async function seedUserCustomerAccess(
  prisma: PrismaClient,
  userIds: Record<string, string>,
  customerIds: Record<string, string>,
): Promise<void> {
  console.log('🌱 Seeding user-customer access links...');

  let seeded = 0;

  for (const link of accessLinks) {
    const userId = userIds[link.userDocument];
    const customerId = customerIds[link.customerDocument];

    if (!userId || !customerId) {
      console.warn(
        `  ⚠ Pulando vínculo ${link.userDocument} -> ${link.customerDocument}: usuário ou cliente não encontrado`,
      );
      continue;
    }

    await prisma.userCustomerAccess.upsert({
      where: { userId_customerId: { userId, customerId } },
      update: { relationship: link.relationship },
      create: { userId, customerId, relationship: link.relationship },
    });

    seeded += 1;
    console.log(`  ✓ Access: ${link.userDocument} -> ${link.customerDocument} (${link.relationship})`);
  }

  console.log(`✅ ${seeded} access links seeded`);
}
```

- [ ] **Step 3: Editar `app/prisma/seed.ts`**

```typescript
/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { seedUsers } from './seeds/user.seed';
import { seedServices } from './seeds/service.seed';
import { seedCustomers } from './seeds/customer.seed';
import { seedUserCustomerAccess } from './seeds/user-customer-access.seed';
import { seedVehicles } from './seeds/vehicle.seed';
import { seedPartSupplies } from './seeds/part-supply.seed';
import { seedWorkOrders } from './seeds/work-order.seed';
import { seedWorkOrderStatusInfos } from './seeds/work-order-status-info.seed';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('🚀 Starting database seed...\n');

  await seedWorkOrderStatusInfos(prisma);
  const userIds = await seedUsers(prisma);
  await seedPartSupplies(prisma);
  const serviceIds = await seedServices(prisma);
  const customerIds = await seedCustomers(prisma);
  await seedUserCustomerAccess(prisma, userIds, customerIds);
  const vehicleIds = await seedVehicles(prisma, customerIds);
  await seedWorkOrders(prisma, customerIds, vehicleIds, serviceIds);

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e: Error) => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
```

- [ ] **Step 4: Validar o seed de ponta a ponta num banco descartável**

Run:
```bash
docker run -d --name seed-verify-pg-2 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=techchallenge -p 15435:5432 postgres:16-alpine
# aguardar "docker exec seed-verify-pg-2 pg_isready -U postgres" retornar OK
cd app
DATABASE_URL="postgresql://postgres:postgres@localhost:15435/techchallenge?schema=public" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:postgres@localhost:15435/techchallenge?schema=public" npx prisma db seed
docker exec seed-verify-pg-2 psql -U postgres -d techchallenge -c \
  "SELECT u.name, u.role, uca.relationship, c.name AS customer_name FROM user_customer_access uca JOIN users u ON u.id = uca.user_id JOIN customers c ON c.id = uca.customer_id;"
docker rm -f seed-verify-pg-2
```
Expected: a última query retorna 2 linhas — `João da Silva | CUSTOMER | SELF | João da Silva` e `Carlos Mendes | CUSTOMER | REPRESENTATIVE | Oficina Parceira LTDA`.

- [ ] **Step 5: Commit**

```bash
git add app/prisma/seeds/user.seed.ts app/prisma/seeds/user-customer-access.seed.ts app/prisma/seed.ts
git commit -m "feat(seed): provisionar acesso de João da Silva (SELF) e representante da Oficina Parceira (REPRESENTATIVE)"
```

---

### Task 10: E2E — vínculo `UserCustomerAccess` e escopo de `GET /work-orders`

**Files:**
- Modify: `app/test/helpers/auth.helper.ts`
- Create: `app/test/e2e/user-customer-access.e2e-spec.ts`

**Interfaces:**
- Consumes: `POST /customers/:id/access`, `GET /work-orders`, `GET /work-orders/:id`, `POST /auth/login`.

- [ ] **Step 1: Ampliar `registerAndLogin` para aceitar a role `CUSTOMER`**

Editar `app/test/helpers/auth.helper.ts`, trocando a linha do `role` dentro do bloco `if (prisma)`:

```typescript
    await prisma.user.create({
      data: {
        name,
        email,
        document,
        passwordHash: hashedPassword,
        role: role as 'ADMIN' | 'MECHANIC' | 'ATTENDANT' | 'CUSTOMER',
      },
    });
```

(O resto do arquivo não muda — `role` já é `string` na assinatura de `overrides`.)

- [ ] **Step 2: Criar `app/test/e2e/user-customer-access.e2e-spec.ts`**

```typescript
import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { registerAndLogin, AuthTokens } from '../helpers/auth.helper';
import { nextValidCpf } from '../helpers/document.helper';

describe('UserCustomerAccess (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;
  let adminAuth: AuthTokens;

  beforeAll(async () => {
    ctx = await setupTestApp();
    httpServer = ctx.httpServer;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    adminAuth = await registerAndLogin(httpServer, { role: 'ADMIN' }, ctx.prisma);
  });

  async function createCustomer(document: string, type: 'INDIVIDUAL' | 'COMPANY' = 'INDIVIDUAL') {
    const res = await request(httpServer)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        name: 'Cliente Teste',
        document,
        type,
        email: `cliente-${Date.now()}-${Math.floor(Math.random() * 10000)}@e2e.test`,
        phone: '11999999999',
        address: { street: 'Rua A', city: 'São Paulo', state: 'SP', zipCode: '01310100' },
      })
      .expect(201);

    return res.body.data.id as string;
  }

  async function createCustomerUser(document: string) {
    return registerAndLogin(httpServer, { role: 'CUSTOMER', document }, ctx.prisma);
  }

  describe('POST /api/customers/:id/access', () => {
    it('should create a SELF link when documents match', async () => {
      const document = nextValidCpf();
      const customerId = await createCustomer(document);
      const customerUser = await createCustomerUser(document);

      const res = await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(201);

      expect(res.body.data.relationship).toBe('SELF');
      expect(res.body.data.userId).toBe(customerUser.user.id);
      expect(res.body.data.customerId).toBe(customerId);
    });

    it('should reject a SELF link when documents differ (422)', async () => {
      const customerId = await createCustomer(nextValidCpf());
      const customerUser = await createCustomerUser(nextValidCpf());

      await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(422);
    });

    it('should create a REPRESENTATIVE link even when documents differ', async () => {
      const customerId = await createCustomer('12345678000195', 'COMPANY');
      const customerUser = await createCustomerUser(nextValidCpf());

      const res = await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'REPRESENTATIVE' })
        .expect(201);

      expect(res.body.data.relationship).toBe('REPRESENTATIVE');
    });

    it('should reject linking a user whose role is not CUSTOMER (422)', async () => {
      const customerId = await createCustomer(nextValidCpf());
      const staffUser = await registerAndLogin(httpServer, { role: 'ATTENDANT' }, ctx.prisma);

      await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: staffUser.user.id, relationship: 'SELF' })
        .expect(422);
    });

    it('should return 409 when the same user/customer pair is linked twice', async () => {
      const document = nextValidCpf();
      const customerId = await createCustomer(document);
      const customerUser = await createCustomerUser(document);

      await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(201);

      await request(httpServer)
        .post(`/api/customers/${customerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(409);
    });

    it('should return 404 for a non-existent customer', async () => {
      const customerUser = await createCustomerUser(nextValidCpf());

      await request(httpServer)
        .post('/api/customers/00000000-0000-0000-0000-000000000000/access')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(404);
    });
  });

  describe('GET /api/work-orders with role CUSTOMER', () => {
    async function createWorkOrderForCustomer(customerId: string): Promise<string> {
      const vehicleRes = await request(httpServer)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId,
          plate: `SLF${Math.floor(1000 + Math.random() * 9000)}`,
          brand: 'Fiat',
          model: 'Uno',
          year: 2020,
        })
        .expect(201);

      const workOrderRes = await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId,
          vehicleId: vehicleRes.body.data.id,
          problemDescription: 'Barulho no motor',
        })
        .expect(201);

      return workOrderRes.body.data.id as string;
    }

    it('should list only work orders of customers linked to the authenticated user', async () => {
      const document = nextValidCpf();
      const myCustomerId = await createCustomer(document);
      const otherCustomerId = await createCustomer(nextValidCpf());

      const customerUser = await createCustomerUser(document);
      await request(httpServer)
        .post(`/api/customers/${myCustomerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(201);

      const myWorkOrderId = await createWorkOrderForCustomer(myCustomerId);
      await createWorkOrderForCustomer(otherCustomerId);

      const res = await request(httpServer)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${customerUser.accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(myWorkOrderId);
    });

    it('should ignore a ?customerId= query param for a CUSTOMER caller (IDOR protection)', async () => {
      const document = nextValidCpf();
      const myCustomerId = await createCustomer(document);
      const otherCustomerId = await createCustomer(nextValidCpf());

      const customerUser = await createCustomerUser(document);
      await request(httpServer)
        .post(`/api/customers/${myCustomerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(201);

      const myWorkOrderId = await createWorkOrderForCustomer(myCustomerId);
      await createWorkOrderForCustomer(otherCustomerId);

      const res = await request(httpServer)
        .get(`/api/work-orders?customerId=${otherCustomerId}`)
        .set('Authorization', `Bearer ${customerUser.accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(myWorkOrderId);
    });

    it('should list work orders of a REPRESENTATIVE across multiple customers', async () => {
      const companyId = await createCustomer('12345678000195', 'COMPANY');
      const representative = await createCustomerUser(nextValidCpf());

      await request(httpServer)
        .post(`/api/customers/${companyId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: representative.user.id, relationship: 'REPRESENTATIVE' })
        .expect(201);

      const companyWorkOrderId = await createWorkOrderForCustomer(companyId);

      const res = await request(httpServer)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${representative.accessToken}`)
        .expect(200);

      expect(res.body.data.map((wo: { id: string }) => wo.id)).toContain(companyWorkOrderId);
    });

    it('should return 401 without a token', async () => {
      await request(httpServer).get('/api/work-orders').expect(401);
    });
  });

  describe('GET /api/work-orders/:id with role CUSTOMER', () => {
    it('should return 404 for a work order outside the caller scope', async () => {
      const otherCustomerId = await createCustomer(nextValidCpf());

      const vehicleRes = await request(httpServer)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId: otherCustomerId,
          plate: `OUT${Math.floor(1000 + Math.random() * 9000)}`,
          brand: 'Fiat',
          model: 'Uno',
          year: 2020,
        })
        .expect(201);

      const workOrderRes = await request(httpServer)
        .post('/api/work-orders')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({
          customerId: otherCustomerId,
          vehicleId: vehicleRes.body.data.id,
          problemDescription: 'Problema qualquer',
        })
        .expect(201);

      const document = nextValidCpf();
      const myCustomerId = await createCustomer(document);
      const customerUser = await createCustomerUser(document);
      await request(httpServer)
        .post(`/api/customers/${myCustomerId}/access`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ userId: customerUser.user.id, relationship: 'SELF' })
        .expect(201);

      await request(httpServer)
        .get(`/api/work-orders/${workOrderRes.body.data.id}`)
        .set('Authorization', `Bearer ${customerUser.accessToken}`)
        .expect(404);
    });
  });

  describe('login as a CUSTOMER-role user', () => {
    it('should authenticate by document (CPF) and access GET /api/work-orders', async () => {
      const document = nextValidCpf();
      await createCustomerUser(document);

      const loginRes = await request(httpServer)
        .post('/api/auth/login')
        .send({ identifier: document, password: 'Test@2026' })
        .expect(200);

      await request(httpServer)
        .get('/api/work-orders')
        .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
        .expect(200);
    });
  });
});
```

- [ ] **Step 3: Rodar a suíte e2e criada**

Run: `cd app && npx jest --config ./test/jest-e2e.json test/e2e/user-customer-access.e2e-spec.ts -v`
Expected: PASS (todos os testes).

- [ ] **Step 4: Rodar toda a suíte e2e para garantir que nada mais quebrou**

Run: `cd app && npm run test:e2e 2>&1 | tail -60`
Expected: PASS em todas as suítes e2e (incluindo as que usam `registerAndLogin`, `quote.e2e-spec.ts`, `work-order.e2e-spec.ts` etc. — nenhuma delas deveria ter sido afetada, já que a role `CUSTOMER` só se aplica quando explicitamente usada).

- [ ] **Step 5: Commit**

```bash
git add app/test/helpers/auth.helper.ts app/test/e2e/user-customer-access.e2e-spec.ts
git commit -m "test(e2e): cobrir criação de vínculo UserCustomerAccess e escopo de GET /work-orders para CUSTOMER"
```

---

### Task 11: Postman collection — remover fluxo antigo, adicionar `UserCustomerAccess`

**Files:**
- Modify: `collections/oficina-collection.json`
- Modify: `collections/oficina-environment.json`

**Interfaces:** nenhuma nova — só reflete a API já implementada nas Tasks 1-10.

Contexto: a collection já foi atualizada numa sessão anterior para a feature de login separado do cliente (pasta "Autoatendimento do Cliente", itens `TC-CLI-01` a `TC-CLI-19`, e os itens `TC-CUST-21`/`TC-CUST-22` de redefinição de senha do cliente). Toda essa infraestrutura deixou de existir (Task 8) e precisa ser removida da collection; o novo fluxo (`UserCustomerAccess`, `GET /work-orders` para `CUSTOMER`) precisa ser adicionado.

Edite a collection via script Python (mesma técnica já usada nesta collection: `json.load` → mutar → `json.dump(..., indent=2, ensure_ascii=False)` + `\n` final — verificado nesta sessão como round-trip-seguro para este arquivo específico). Não edite o JSON manualmente por substituição de string.

- [ ] **Step 1: Remover a pasta "Autoatendimento do Cliente" e os itens de senha de cliente**

Escrever e rodar um script Python que:
1. Remove o item de nível superior cujo `name` é `"Autoatendimento do Cliente"` (array `data['item']`).
2. Dentro da pasta `"Gestão de Clientes"`, remove os itens cujo `name` começa com `"TC-CUST-21"` ou `"TC-CUST-22"`.
3. Remove do `collections/oficina-environment.json` as chaves: `customerAccessToken`, `customerRefreshToken`, `customerPassword`, `selfServiceCustomerId`, `selfServiceVehicleId`, `selfServiceWorkOrderId`, `selfServiceServiceId`, `selfServiceQuoteId`.

```python
import json

with open('collections/oficina-collection.json', encoding='utf-8') as f:
    data = json.load(f)

data['item'] = [it for it in data['item'] if it.get('name') != 'Autoatendimento do Cliente']

for it in data['item']:
    if it.get('name') == 'Gestão de Clientes':
        it['item'] = [
            sub for sub in it['item']
            if not sub['name'].startswith('TC-CUST-21') and not sub['name'].startswith('TC-CUST-22')
        ]

with open('collections/oficina-collection.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')

with open('collections/oficina-environment.json', encoding='utf-8') as f:
    env = json.load(f)

removed_keys = {
    'customerAccessToken', 'customerRefreshToken', 'customerPassword',
    'selfServiceCustomerId', 'selfServiceVehicleId', 'selfServiceWorkOrderId',
    'selfServiceServiceId', 'selfServiceQuoteId',
}
env['values'] = [v for v in env['values'] if v['key'] not in removed_keys]

with open('collections/oficina-environment.json', 'w', encoding='utf-8') as f:
    json.dump(env, f, indent=2, ensure_ascii=False)
    f.write('\n')

print('OK')
```

- [ ] **Step 2: Confirmar a remoção**

Run:
```bash
python3 -c "
import json
with open('collections/oficina-collection.json', encoding='utf-8') as f:
    data = json.load(f)
names = [it['name'] for it in data['item']]
assert 'Autoatendimento do Cliente' not in names, names
for it in data['item']:
    if it['name'] == 'Gestão de Clientes':
        assert not any(s['name'].startswith('TC-CUST-21') or s['name'].startswith('TC-CUST-22') for s in it['item'])
print('OK - pasta e itens antigos removidos')
"
```
Expected: `OK - pasta e itens antigos removidos`.

- [ ] **Step 3: Adicionar os itens de `POST /customers/:id/access` em "Gestão de Clientes"**

Escrever e rodar um script Python que adiciona, ao final da pasta `"Gestão de Clientes"`, os seguintes itens (seguindo a convenção `TC-CUST-NN — descrição`, numerados a partir do próximo número livre — confira o último `TC-CUST-NN` existente antes de escolher os números; assuma `TC-CUST-21` em diante, já que os antigos 21/22 foram removidos no Step 1):

- `TC-CUST-21 — Vincular usuário CUSTOMER ao cliente (SELF, sucesso)`: `POST {{baseUrl}}/customers/{{customerId}}/access`, corpo `{"userId": "{{customerSelfUserId}}", "relationship": "SELF"}`, espera 201, salva `pm.environment.set('userCustomerAccessId', res.data.id)`.
- `TC-CUST-22 — Vincular com documentos diferentes em SELF (422)`.
- `TC-CUST-23 — Vincular como REPRESENTATIVE com documentos diferentes (sucesso)`.
- `TC-CUST-24 — Vincular usuário sem role CUSTOMER (422)`.
- `TC-CUST-25 — Vincular o mesmo par novamente (409)`.
- `TC-CUST-26 — Vincular a cliente inexistente (404)`.
- `TC-CUST-27 — Vincular sem autenticação (401)`.

Cada item usa o mesmo formato JSON já usado pelos demais itens da collection (`request.url` como `{raw, host, path}`, `request.body.mode: "raw"`, `event` com `pm.test`). Como pré-requisito, os itens `TC-CUST-21`/`TC-CUST-23` precisam de um usuário `CUSTOMER` já criado — adicione, antes deles, dois itens novos `TC-CUST-19b — Criar usuário CUSTOMER (self, mesmo documento do cliente)` e `TC-CUST-19c — Criar usuário CUSTOMER (representante, documento diferente)`, chamando `POST {{baseUrl}}/users` com `role: "CUSTOMER"` e `document` igual/diferente do `{{customerId}}` criado em `TC-CUST-01`, salvando `customerSelfUserId`/`customerRepresentativeUserId` respectivamente. Use o CPF `929.362.770-19` (o mesmo já usado como `document` do cliente em `TC-CUST-01`, confirmado no arquivo) para o usuário SELF, e um CPF distinto e válido para o representante.

- [ ] **Step 4: Adicionar a pasta "Autoatendimento do Cliente" (reformulada)**

Escrever e rodar um script Python que insere uma nova pasta de nível superior, posicionada após `"Gestão de Clientes"` e antes de `"Gestão de Veículos"`, com a seguinte `description`:

> "Fluxo de autoatendimento do Cliente da Oficina após a reformulação: o cliente loga pela MESMA rota de login de usuários (POST /auth/login, por e-mail ou CPF), pois agora é apenas um User com role CUSTOMER. O único acesso liberado é consultar as próprias ordens de serviço (GET /work-orders e GET /work-orders/:id, escopados automaticamente pelo vínculo UserCustomerAccess). Aprovação/rejeição de orçamento continua exclusivamente pelo link enviado por e-mail."

Itens (`TC-CLI-01` em diante, reaproveitando a numeração já que a pasta antiga foi removida):

- `TC-CLI-01 — Login do usuário CUSTOMER (self) por CPF`: `POST {{baseUrl}}/auth/login`, `auth: noauth`, corpo `{"identifier": "92936277019", "password": "Tech@2026"}` (mesma senha padrão usada nos demais usuários seedados/criados na collection), salva `customerAccessToken`.
- `TC-CLI-02 — Cliente consulta suas próprias ordens de serviço`: `GET {{baseUrl}}/work-orders`, auth bearer override `{{customerAccessToken}}`, teste confere que toda OS retornada tem `customer.id === {{customerId}}`.
- `TC-CLI-03 — Cliente tenta forçar customerId de outro cliente via query (ignorado)`: `GET {{baseUrl}}/work-orders?customerId={{customerId2}}`, mesmo bearer, teste confere que o resultado ainda é só do próprio cliente (não do `customerId2`).
- `TC-CLI-04 — Cliente busca uma OS específica sua (200)`.
- `TC-CLI-05 — Cliente busca uma OS de outro cliente (404)`.
- `TC-CLI-06 — Cliente tenta acessar rota de staff (401 ou 403 conforme guard)`: `GET {{baseUrl}}/users` com o bearer do cliente — como o JWT é o mesmo domínio de `User` agora, o `JwtAuthGuard` aceita o token (mesma assinatura), mas o `RolesGuard` nega por role — espere **403**, não 401 (diferença importante em relação à arquitetura anterior, onde o guard rejeitava por secret diferente).

Para os itens `TC-CLI-02`/`TC-CLI-03`/`TC-CLI-04`, é necessário que exista pelo menos uma OS associada ao `{{customerId}}` — reaproveite a OS já criada em `TC-WO-01` (que já usa `{{customerId}}`/`{{vehicleId}}`), sem duplicar setup.

- [ ] **Step 5: Validar o arquivo final**

Run:
```bash
python3 -c "
import json
for path in ['collections/oficina-collection.json', 'collections/oficina-environment.json']:
    with open(path, encoding='utf-8') as f:
        json.load(f)
    print(path, 'OK valid JSON')
"
git diff --stat -- collections/
```
Expected: os dois arquivos continuam JSON válido; o diff mostra remoções (pasta antiga, itens antigos, variáveis antigas) e adições (novos itens/pasta) coerentes com esta task.

- [ ] **Step 6: Commit**

```bash
git add collections/oficina-collection.json collections/oficina-environment.json
git commit -m "docs(postman): substituir fluxo de login separado do cliente por UserCustomerAccess"
```

---

## Self-Review (Task-Writer Checklist)

- **Cobertura da spec:** modelo de dados (Task 1-3), remoção de senha/e-mail em `Customer` (Task 2-3-4), provisionamento manual via `POST /users` + `POST /customers/:id/access` (Task 4-5), escopo de `GET /work-orders`/`GET /work-orders/:id` sem uso de `?customerId=` e com 404 fora do escopo (Task 6-7), remoção completa da stack de auth de cliente (Task 8), seeds SELF/REPRESENTATIVE (Task 9), e2e (Task 10), Postman (Task 11). Nenhum requisito da spec ficou sem task correspondente.
- **Placeholders:** nenhum "TBD"/"implementar depois" no plano — toda task tem código completo. As únicas referências "a definir" (numeração exata de itens novos no Postman) são inerentes a editar um arquivo vivo de 8000+ linhas e foram resolvidas dando a convenção exata a seguir, não deixadas em aberto.
- **Consistência de tipos:** `WorkOrderFilters.customerIdIn`/`FindAllWorkOrdersFilters.customerIdIn`/`FindAllWorkOrdersQuery.customerIdIn` usam o mesmo nome e tipo (`string[]`) em todas as camadas (Tasks 6-7). `AccessRelationship` é usado de forma idêntica em domínio, DTOs, HTTP DTOs e seeds. `IUserCustomerAccessRepository` tem a mesma assinatura em todas as tasks que o consomem (3, 4, 6).
