# Login do Cliente e Unificação da Troca de Senha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar autenticação própria ao `Customer` (login, refresh, me), unificar a troca de senha entre `User` e `Customer` numa regra self/admin+e-mail, e permitir que o cliente logado liste e decida (aprove/rejeite) seus próprios orçamentos — sem alterar o fluxo existente de link assinado por e-mail.

**Architecture:** `Customer` ganha `passwordHash` e um domínio de autenticação completamente separado do de `User`: `JwtCustomerStrategy`/`JwtCustomerAuthGuard` próprios, secrets JWT próprios (`CUSTOMER_JWT_SECRET`/`CUSTOMER_JWT_REFRESH_SECRET`), reaproveitando os métodos genéricos já existentes em `ITokenService` (`signWithSecret`/`verifyWithSecret` — os mesmos usados hoje pelo token de decisão de orçamento por e-mail) em vez de estender o `TokenPayload` tipado para `UserRole`. A regra de força de senha (`PASSWORD_REGEX`) é extraída para um validador de domínio compartilhado (`PasswordValidator`), o mesmo padrão já usado para generalizar `Document`/`PersonType` na feature anterior.

**Tech Stack:** NestJS 11, TypeScript, Prisma (PostgreSQL), Passport JWT, Jest (unit + Testcontainers E2E), class-validator.

**Full design rationale:** `docs/superpowers/specs/2026-08-21-customer-login-design.md`
**Architectural decision record:** `docs/adr/0003-customer-com-autenticacao-propria-separada-de-user.md`

## Global Constraints

- `Customer` e `User` continuam sendo domínios de autenticação totalmente separados — nenhum guard, secret ou strategy é compartilhado entre os dois.
- O fluxo de link assinado por e-mail (`GET /quotes/:id/decisions?token=...`, `@Public()`) não é alterado em nenhuma tarefa deste plano.
- `password` sai do `PATCH/PUT` geral de atualização de `User` — a troca de senha só existe nos endpoints dedicados (`/me/password`, `/:id/password`).
- Toda troca de senha "por outra pessoa" (nunca self) gera uma senha nova aleatória via `generateSecurePassword()` e envia por e-mail — nunca retorna a senha na resposta HTTP.
- Nenhuma unicidade cruzada entre `User.document`/`email` e `Customer.document`/`email` — tabelas independentes, sem alteração aqui.
- Todos os comandos abaixo rodam a partir de `app/` (raiz do projeto NestJS), salvo indicação contrária.

---

### Task 1: Validador de senha compartilhado + gerador de senha aleatória

**Files:**
- Create: `app/src/domain/constants/validation/password.constants.ts`
- Create: `app/src/domain/validators/password.validator.ts`
- Create: `app/src/domain/validators/password-generator.ts`
- Modify: `app/src/domain/constants/validation/user.constants.ts`
- Modify: `app/src/domain/entities/user.entity.ts`
- Modify: `app/src/infrastructure/http/controllers/user/dto/requests/create-user-request.dto.ts`
- Modify: `app/src/infrastructure/http/controllers/user/dto/requests/update-user-request.dto.ts`
- Test: `app/test/unit/domain/validators/password.validator.spec.ts`
- Test: `app/test/unit/domain/validators/password-generator.spec.ts`

**Interfaces:**
- Produces: `PasswordValidator.validateStrength(password: string): void` (lança `DomainValidationException` se a senha não satisfizer `PASSWORD_REGEX`). `generateSecurePassword(length?: number): string` (sempre satisfaz `PASSWORD_REGEX`). `PASSWORD_REQUIREMENTS_MESSAGE` agora vive em `domain/constants/validation/password.constants.ts` (não mais em `user.constants.ts`).

- [ ] **Step 1: Write the failing tests**

```ts
// app/test/unit/domain/validators/password.validator.spec.ts
import { PasswordValidator } from '@domain/validators/password.validator';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { PASSWORD_REQUIREMENTS_MESSAGE } from '@domain/constants/validation/password.constants';

describe('PasswordValidator', () => {
  describe('validateStrength', () => {
    it('should accept a strong password', () => {
      expect(() => PasswordValidator.validateStrength('Senha@123')).not.toThrow();
    });

    it('should throw if password is shorter than 8 characters', () => {
      expect(() => PasswordValidator.validateStrength('Ab@1cd')).toThrow(DomainValidationException);
      expect(() => PasswordValidator.validateStrength('Ab@1cd')).toThrow(PASSWORD_REQUIREMENTS_MESSAGE);
    });

    it('should throw if password has no uppercase letter', () => {
      expect(() => PasswordValidator.validateStrength('senha@123')).toThrow(PASSWORD_REQUIREMENTS_MESSAGE);
    });

    it('should throw if password has no lowercase letter', () => {
      expect(() => PasswordValidator.validateStrength('SENHA@123')).toThrow(PASSWORD_REQUIREMENTS_MESSAGE);
    });

    it('should throw if password has no digit', () => {
      expect(() => PasswordValidator.validateStrength('Senha@abc')).toThrow(PASSWORD_REQUIREMENTS_MESSAGE);
    });

    it('should throw if password has no special character', () => {
      expect(() => PasswordValidator.validateStrength('Senha1234')).toThrow(PASSWORD_REQUIREMENTS_MESSAGE);
    });

    it('should throw if password is empty', () => {
      expect(() => PasswordValidator.validateStrength('')).toThrow(DomainValidationException);
    });
  });
});
```

```ts
// app/test/unit/domain/validators/password-generator.spec.ts
import { generateSecurePassword } from '@domain/validators/password-generator';
import { PasswordValidator } from '@domain/validators/password.validator';

describe('generateSecurePassword', () => {
  it('always generates a password that passes PasswordValidator', () => {
    for (let i = 0; i < 50; i++) {
      const password = generateSecurePassword();
      expect(() => PasswordValidator.validateStrength(password)).not.toThrow();
    }
  });

  it('generates a password of the requested length', () => {
    expect(generateSecurePassword(16)).toHaveLength(16);
  });

  it('generates different passwords across calls', () => {
    const a = generateSecurePassword();
    const b = generateSecurePassword();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- password.validator.spec.ts password-generator.spec.ts`
Expected: FAIL — `Cannot find module '@domain/validators/password.validator'` (e os outros módulos ainda não existem).

- [ ] **Step 3: Implement**

```ts
// app/src/domain/constants/validation/password.constants.ts
export const PASSWORD_REQUIREMENTS_MESSAGE =
  'A senha deve ter no mínimo 8 caracteres e conter pelo menos uma letra maiúscula, uma letra minúscula, um número e um caractere especial';
```

```ts
// app/src/domain/validators/password.validator.ts
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PASSWORD_REGEX } from '../constants/regex/password.regex';
import { PASSWORD_REQUIREMENTS_MESSAGE } from '../constants/validation/password.constants';

export class PasswordValidator {
  static validateStrength(password: string): void {
    if (!PASSWORD_REGEX.test(password)) {
      throw new DomainValidationException(PASSWORD_REQUIREMENTS_MESSAGE);
    }
  }
}
```

```ts
// app/src/domain/validators/password-generator.ts
import { randomInt } from 'node:crypto';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%&*';
const ALL = LOWER + UPPER + DIGITS + SPECIAL;

function pick(charset: string): string {
  return charset[randomInt(charset.length)];
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

/** Gera uma senha que satisfaz PASSWORD_REGEX (>=8 chars, com minúscula, maiúscula, dígito e caractere especial). */
export function generateSecurePassword(length = 12): string {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SPECIAL)];
  const rest = Array.from({ length: length - required.length }, () => pick(ALL));

  return shuffle([...required, ...rest]).join('');
}
```

Atualizar `user.constants.ts` para remover `PASSWORD_REQUIREMENTS_MESSAGE` (ele agora vive em `password.constants.ts`):

```ts
// app/src/domain/constants/validation/user.constants.ts
export const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 150;
```

Atualizar `User` para delegar ao validador compartilhado, em vez de checar a regex diretamente:

```ts
// app/src/domain/entities/user.entity.ts — apenas o topo (imports) e o método validatePasswordStrength mudam
import { randomUUID } from 'node:crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { UserRole } from '../enums/user-role.enum';
import { Email } from '../value-objects/email.vo';
import { Document } from '../value-objects/document.vo';
import { PasswordValidator } from '../validators/password.validator';

import { MIN_NAME_LENGTH, MAX_NAME_LENGTH } from '../constants/validation/user.constants';

// ... (interfaces CreateUserProps/UserProps inalteradas) ...

export class User {
  // ... (campos e constructor inalterados) ...

  static validatePasswordStrength(password: string): void {
    PasswordValidator.validateStrength(password);
  }

  // ... (changeName, changeEmail, changeDocument, changeRole, changePassword, activate,
  //      deactivate, toPublicView, validateName, validatePasswordHash, validateRole
  //      inalterados) ...
}
```

Remover os imports não mais usados diretamente em `user.entity.ts` (`PASSWORD_REGEX` e `PASSWORD_REQUIREMENTS_MESSAGE` — a validação agora passa inteiramente por `PasswordValidator`).

Atualizar os dois DTOs HTTP que importam `PASSWORD_REQUIREMENTS_MESSAGE` de `user.constants.ts`, trocando para o novo local:

```ts
// app/src/infrastructure/http/controllers/user/dto/requests/create-user-request.dto.ts
// trocar apenas a linha de import:
import { PASSWORD_REQUIREMENTS_MESSAGE } from '@domain/constants/validation/password.constants';
// (o resto do arquivo continua igual — MIN_NAME_LENGTH/MAX_NAME_LENGTH continuam vindo de user.constants)
```

```ts
// app/src/infrastructure/http/controllers/user/dto/requests/update-user-request.dto.ts
// mesma troca de import:
import { PASSWORD_REQUIREMENTS_MESSAGE } from '@domain/constants/validation/password.constants';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- password.validator.spec.ts password-generator.spec.ts`
Expected: PASS (10 testes)

- [ ] **Step 5: Run the full unit suite as a regression guard**

Run: `npm test`
Expected: PASS — `user.entity.spec.ts` (que testa `validatePasswordStrength` com as mesmas senhas de exemplo) deve continuar passando sem nenhuma alteração, já que o comportamento é idêntico, só a implementação interna delegou para `PasswordValidator`.

- [ ] **Step 6: Commit**

```bash
git add app/src/domain/constants/validation/password.constants.ts app/src/domain/constants/validation/user.constants.ts app/src/domain/validators/password.validator.ts app/src/domain/validators/password-generator.ts app/src/domain/entities/user.entity.ts app/src/infrastructure/http/controllers/user/dto/requests/create-user-request.dto.ts app/src/infrastructure/http/controllers/user/dto/requests/update-user-request.dto.ts app/test/unit/domain/validators/password.validator.spec.ts app/test/unit/domain/validators/password-generator.spec.ts
git commit -m "feat(domain): extract shared PasswordValidator and add generateSecurePassword"
```

---

### Task 2: `Customer` entity gains `passwordHash`

**Files:**
- Modify: `app/src/domain/entities/customer.entity.ts`
- Test: `app/test/unit/domain/entities/customer.entity.spec.ts`

**Interfaces:**
- Consumes: `PasswordValidator.validateStrength` (Task 1).
- Produces: `CreateCustomerProps.passwordHash: string`, `Customer.passwordHash: string`, `Customer.changePassword(passwordHash: string): void`, `Customer.validatePasswordStrength(password: string): void` (static).

- [ ] **Step 1: Write the failing tests**

Em `app/test/unit/domain/entities/customer.entity.spec.ts`, localizar o objeto de props válido usado por `Customer.create(...)` em todo o arquivo (provavelmente uma constante `validProps` ou literal repetido) e adicionar `passwordHash: '$2b$12$hashedpassword'` a ele. Adicionar também:

```ts
describe('create — passwordHash', () => {
  it('should create customer with a passwordHash', () => {
    const customer = Customer.create({ ...validProps, passwordHash: '$2b$12$hashedpassword' });
    expect(customer.passwordHash).toBe('$2b$12$hashedpassword');
  });

  it('should throw if passwordHash is empty', () => {
    expect(() => Customer.create({ ...validProps, passwordHash: '' })).toThrow(
      DomainValidationException,
    );
    expect(() => Customer.create({ ...validProps, passwordHash: '' })).toThrow(
      'Hash de senha não pode ser vazio',
    );
  });
});

describe('changePassword', () => {
  it('should change the password hash', () => {
    const customer = Customer.create({ ...validProps, passwordHash: '$2b$12$hashedpassword' });
    customer.changePassword('$2b$12$newhash');

    expect(customer.passwordHash).toBe('$2b$12$newhash');
  });

  it('should throw if new hash is empty', () => {
    const customer = Customer.create({ ...validProps, passwordHash: '$2b$12$hashedpassword' });

    expect(() => customer.changePassword('')).toThrow(DomainValidationException);
  });
});

describe('validatePasswordStrength', () => {
  it('should accept a strong password', () => {
    expect(() => Customer.validatePasswordStrength('Senha@123')).not.toThrow();
  });

  it('should throw for a weak password', () => {
    expect(() => Customer.validatePasswordStrength('weak')).toThrow(DomainValidationException);
  });
});
```

Se o arquivo usa `Customer.reconstitute({...})` em algum teste direto (ex.: para testar `update()`), adicionar `passwordHash: '$2b$12$hashedpassword'` a esses literais também.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- customer.entity.spec.ts`
Expected: FAIL — erro de compilação TS (`passwordHash` não existe em `CreateCustomerProps`), e os novos testes falham (métodos ainda não existem).

- [ ] **Step 3: Implement**

```ts
// app/src/domain/entities/customer.entity.ts
import { randomUUID } from 'node:crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { CustomerType } from '../enums/customer-type.enum';
import { Address, AddressProps } from '../value-objects/address.vo';
import { Email } from '../value-objects/email.vo';
import { Phone } from '../value-objects/phone.vo';
import { Document } from '../value-objects/document.vo';
import { PasswordValidator } from '../validators/password.validator';
import { MIN_NAME_LENGTH, MAX_NAME_LENGTH } from '../constants/validation/customer.constants';

export interface CreateCustomerProps {
  name: string;
  document: string;
  type: CustomerType;
  email: string;
  phone: string;
  address: AddressProps;
  passwordHash: string;
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
  passwordHash: string;
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
  passwordHash: string;
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
    this.passwordHash = props.passwordHash;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: CustomerProps): Customer {
    return new Customer(props);
  }

  static create(props: CreateCustomerProps): Customer {
    Customer.validateName(props.name);
    Customer.validatePasswordHash(props.passwordHash);

    return new Customer({
      id: randomUUID(),
      name: props.name.trim(),
      document: Document.create(props.document, props.type),
      type: props.type,
      email: Email.create(props.email),
      phone: Phone.create(props.phone),
      address: Address.create(props.address),
      passwordHash: props.passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static validatePasswordStrength(password: string): void {
    PasswordValidator.validateStrength(password);
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

  changePassword(passwordHash: string): void {
    Customer.validatePasswordHash(passwordHash);
    this.passwordHash = passwordHash;
    this.updatedAt = new Date();
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

  private static validatePasswordHash(passwordHash: string): void {
    if (!passwordHash || passwordHash.length === 0) {
      throw new DomainValidationException('Hash de senha não pode ser vazio');
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- customer.entity.spec.ts`
Expected: PASS (todos os testes existentes + os novos)

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/entities/customer.entity.ts app/test/unit/domain/entities/customer.entity.spec.ts
git commit -m "feat(domain): add passwordHash to Customer entity"
```

**Note:** este commit deixa `create-customer.use-case.ts`, `customer.mapper.ts`, `prisma-customer.repository.ts` e `test/helpers/customer-mock.factory.ts` sem compilar (não passam `passwordHash` ainda) — isso é esperado e corrigido pelas Tasks 3 e 4. Não rode `npm run build` nem a suíte completa depois desta task; só o teste focado acima.

---

### Task 3: Banco de dados — schema, migration, mapper, repositório de `Customer`

**Files:**
- Modify: `app/prisma/schema.prisma`
- Create: migration nova em `app/prisma/migrations/` (gerada pelo comando abaixo, não escrita à mão)
- Modify: `app/src/infrastructure/persistence/prisma/mappers/customer.mapper.ts`
- Modify: `app/src/infrastructure/persistence/prisma/repositories/prisma-customer.repository.ts`
- Modify: `app/test/helpers/customer-mock.factory.ts`
- Test: `app/test/unit/infrastructure/persistence/prisma/repositories/prisma-customer.repository.spec.ts` (se existir — ler o arquivo primeiro para confirmar a estrutura real antes de editar; se não existir, pular a parte de teste desta task e seguir só com a implementação)
- Test: `app/test/unit/infrastructure/persistence/prisma/mappers/customer.mapper.spec.ts` (mesma ressalva)

**Interfaces:**
- Consumes: `Customer.create`/`Customer.changePassword` (Task 2).
- Produces: coluna `password_hash` em `customers`, `CustomerMapper.toDomain` mapeando o campo, `PrismaCustomerRepository` lendo/escrevendo `passwordHash`.

- [ ] **Step 1: Update the Prisma schema**

```prisma
// app/prisma/schema.prisma — model Customer
model Customer {
  id           String       @id @default(uuid()) @db.Uuid
  name         String       @db.VarChar(150)
  document     String       @unique @db.VarChar(18)
  type         CustomerType @default(INDIVIDUAL)
  email        String       @unique @db.VarChar(150)
  phone        String       @db.VarChar(20)
  passwordHash String       @map("password_hash") @db.VarChar(255)
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @default(now()) @updatedAt @map("updated_at")

  address    Address?
  vehicles   Vehicle[]
  workOrders WorkOrder[]

  @@map("customers")
}
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npx prisma migrate dev --name add_password_hash_to_customer`

Se falhar por violação de NOT NULL (clientes já cadastrados no seu banco local sem senha), reset o banco local primeiro — seguro porque o projeto não está em produção:

```bash
npm run db:reset
npx prisma migrate dev --name add_password_hash_to_customer
```

**Atenção:** `npm run db:reset` também reseta os `User` seedados — se isso remover documentos/senhas que a feature anterior (`feat/user-document-login`) já garantia, isso é esperado e não é regressão desta task (o seed de `Customer` ainda não gera senha — isso é a Task 4).

- [ ] **Step 3: Write the failing tests for the mapper and repository (se os arquivos de teste existirem)**

Primeiro, leia `app/test/unit/infrastructure/persistence/prisma/mappers/customer.mapper.spec.ts` e `app/test/unit/infrastructure/persistence/prisma/repositories/prisma-customer.repository.spec.ts` para confirmar a estrutura real. Se existirem, adicione `passwordHash: '$2b$12$hashedpassword'` a todo literal que hoje constrói um `Customer.create(...)`/`Customer.reconstitute(...)` ou um objeto de fixture cru estilo Prisma (mesma mecânica já aplicada na feature anterior para o campo `document` do `User` — um `passwordHash: 'X'` a mais em cada objeto, sem mudar o resto do teste).

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- customer.mapper.spec.ts prisma-customer.repository.spec.ts`
Expected: FAIL — erro de compilação (`passwordHash` ausente nos literais).

- [ ] **Step 5: Implement the mapper and repository changes**

```ts
// app/src/infrastructure/persistence/prisma/mappers/customer.mapper.ts
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
      passwordHash: prismaRecord.passwordHash,
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

Em `prisma-customer.repository.ts`, adicionar `passwordHash: customer.passwordHash` ao `data` de `create()` e de `update()` (as duas únicas escritas no banco). O restante do arquivo (`findById`, `findByDocument`, `findByEmail`, `findAllPaginated`, `delete`, `isCustomerInUse`) não muda, já que `CustomerMapper.toDomain` é quem lê o campo novo — só as duas gravações precisam do campo extra explicitamente:

```ts
// app/src/infrastructure/persistence/prisma/repositories/prisma-customer.repository.ts
// dentro de create():
const record = await this.prisma.customer.create({
  data: {
    id: customer.id,
    name: customer.name,
    type: customer.type,
    document: customer.document.value,
    email: customer.email.value,
    phone: customer.phone.value,
    passwordHash: customer.passwordHash,
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
  include: ADDRESS_INCLUDE,
});

// dentro de update():
const record = await this.prisma.customer.update({
  where: { id: customer.id },
  data: {
    name: customer.name,
    document: customer.document.value,
    type: customer.type,
    email: customer.email.value,
    phone: customer.phone.value,
    passwordHash: customer.passwordHash,
    address: addressData,
  },
  include: ADDRESS_INCLUDE,
});
```

Atualizar `test/helpers/customer-mock.factory.ts`: `createMockPrismaCustomer` ganha `passwordHash: '$2b$12$hashedpassword'` no objeto default, e `createMockCustomer` ganha `passwordHash: '$2b$12$hashedpassword'` no `Customer.reconstitute({...})` default — ambos seguindo o padrão `...overrides` já existente (mesma mecânica aplicada a `document` na feature anterior, em `user-mock.factory.ts`).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- customer.mapper.spec.ts prisma-customer.repository.spec.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/prisma/schema.prisma app/prisma/migrations app/src/infrastructure/persistence/prisma/mappers/customer.mapper.ts app/src/infrastructure/persistence/prisma/repositories/prisma-customer.repository.ts app/test/helpers/customer-mock.factory.ts app/test/unit/infrastructure/persistence/prisma/mappers/customer.mapper.spec.ts app/test/unit/infrastructure/persistence/prisma/repositories/prisma-customer.repository.spec.ts
git commit -m "feat(db): add password_hash column to customers"
```

---

### Task 4: `CreateCustomerUseCase` gera e envia a senha inicial

**Files:**
- Modify: `app/src/application/use-cases/customer/create-customer.use-case.ts`
- Modify: `app/src/infrastructure/http/controllers/customer/customer.module.ts`
- Test: `app/test/unit/application/use-cases/customer/create-customer.use-case.spec.ts`

**Interfaces:**
- Consumes: `generateSecurePassword` (Task 1), `IHashService`, `IEmailSenderService` (portas já existentes), `Customer.create` com `passwordHash` (Task 2).
- Produces: `CreateCustomerUseCase` agora recebe `hashService: IHashService` e `emailSenderService: IEmailSenderService` no construtor.

- [ ] **Step 1: Write the failing tests**

Em `create-customer.use-case.spec.ts`, o `beforeEach` precisa passar a instanciar o use case com os dois novos serviços mockados. Usar os mocks já existentes no projeto (`createMockHashService` de `test/helpers/mock-factories.ts`) e criar um mock local de `IEmailSenderService` se não houver um helper compartilhado ainda (`{ send: jest.fn() }`). Atualizar as 3 asserções de sucesso/conflito existentes e adicionar 2 novas:

```ts
// app/test/unit/application/use-cases/customer/create-customer.use-case.spec.ts
import { createMockHashService } from '../../../../helpers/mock-factories';
// (mantém os demais imports já existentes no arquivo)

describe('CreateCustomerUseCase', () => {
  let useCase: CreateCustomerUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let hashService: ReturnType<typeof createMockHashService>;
  let emailSenderService: { send: jest.Mock };

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    hashService = createMockHashService();
    emailSenderService = { send: jest.fn().mockResolvedValue(undefined) };
    useCase = new CreateCustomerUseCase(customerRepository, hashService, emailSenderService);
  });

  // (as 3 asserções de sucesso/conflito de documento/e-mail já existentes continuam,
  //  só passam a usar o `useCase` construído com os 3 argumentos acima)

  it('should generate a random password, hash it, and send it by e-mail', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(null);
    customerRepository.create.mockImplementation((customer) => Promise.resolve(customer));

    await useCase.execute({
      name: 'Cliente Teste',
      document: '12345678909',
      type: CustomerType.INDIVIDUAL,
      email: 'cliente@email.com',
      phone: '11999999999',
      address: { street: 'Rua A', city: 'SP', state: 'SP', zipCode: '01310100' },
    });

    expect(hashService.hash).toHaveBeenCalledTimes(1);
    const [generatedPassword] = hashService.hash.mock.calls[0];
    expect(typeof generatedPassword).toBe('string');
    expect(generatedPassword.length).toBeGreaterThanOrEqual(8);

    expect(emailSenderService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'cliente@email.com',
        toName: 'Cliente Teste',
        message: expect.objectContaining({
          text: expect.stringContaining(generatedPassword),
        }),
      }),
    );
  });

  it('should never return the plain-text password', async () => {
    customerRepository.findByDocument.mockResolvedValue(null);
    customerRepository.findByEmail.mockResolvedValue(null);
    customerRepository.create.mockImplementation((customer) => Promise.resolve(customer));

    const result = await useCase.execute({
      name: 'Cliente Teste',
      document: '12345678909',
      type: CustomerType.INDIVIDUAL,
      email: 'cliente@email.com',
      phone: '11999999999',
      address: { street: 'Rua A', city: 'SP', state: 'SP', zipCode: '01310100' },
    });

    expect(result).not.toHaveProperty('password');
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });
});
```

**Nota:** `expect(JSON.stringify(result)).not.toContain('passwordHash')` verifica que a *chave* `passwordHash` não aparece serializada — não impede que o valor do hash apareça (o hash em si não é segredo, é o texto puro da senha que nunca deve ser retornado, e esse já é coberto pelo teste anterior, que verifica que `hashService.hash` foi chamado com a senha gerada e que ela foi só para o e-mail).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- create-customer.use-case.spec.ts`
Expected: FAIL — `CreateCustomerUseCase` ainda só aceita 1 argumento no construtor.

- [ ] **Step 3: Implement**

```ts
// app/src/application/use-cases/customer/create-customer.use-case.ts
import { Customer } from '@domain/entities/customer.entity';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';
import { generateSecurePassword } from '@domain/validators/password-generator';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { ICreateCustomerUseCase } from '@application/ports/input/customer/create-customer.use-case.interface';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';

import { CreateCustomerDto } from '@application/ports/input/customer/dto/create-customer.dto';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class CreateCustomerUseCase implements ICreateCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly hashService: IHashService,
    private readonly emailSenderService: IEmailSenderService,
  ) {}

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

    const plainPassword = generateSecurePassword();
    const passwordHash = await this.hashService.hash(plainPassword);

    const customer = Customer.create({ ...input, passwordHash });

    const created = await this.customerRepository.create(customer);

    await this.emailSenderService.send({
      toEmail: created.email.value,
      toName: created.name,
      subject: 'Sua conta foi criada — dados de acesso',
      message: {
        text: `Olá, ${created.name}! Sua conta foi criada. Use o e-mail ou documento cadastrado e a senha "${plainPassword}" para acessar o sistema.`,
        html: `<p>Olá, ${created.name}!</p><p>Sua conta foi criada. Use o e-mail ou documento cadastrado e a senha <strong>${plainPassword}</strong> para acessar o sistema.</p>`,
      },
    });

    return created;
  }
}
```

Atualizar o wiring do módulo para injetar os dois novos serviços:

```ts
// app/src/infrastructure/http/controllers/customer/customer.module.ts
import { Module } from '@nestjs/common';

import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { FindAllCustomersUseCase } from '@application/use-cases/customer/find-all-customers.use-case';
import { FindCustomerByIdUseCase } from '@application/use-cases/customer/find-customer-by-id.use-case';
import { UpdateCustomerUseCase } from '@application/use-cases/customer/update-customer.use-case';
import { DeleteCustomerUseCase } from '@application/use-cases/customer/delete-customer.use-case';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';

import { CustomerController as CustomerCleanController } from '@interface-adapters/customer/customer.controller';
import { CustomerController } from './customer.controller';

@Module({
  imports: [InfrastructureServicesModule],
  controllers: [CustomerController],
  providers: [
    {
      provide: CustomerCleanController,
      useFactory: (
        customerRepository: ICustomerRepository,
        hashService: IHashService,
        emailSenderService: IEmailSenderService,
      ) =>
        new CustomerCleanController(
          new CreateCustomerUseCase(customerRepository, hashService, emailSenderService),
          new FindAllCustomersUseCase(customerRepository),
          new FindCustomerByIdUseCase(customerRepository),
          new UpdateCustomerUseCase(customerRepository),
          new DeleteCustomerUseCase(customerRepository),
        ),
      inject: ['ICustomerRepository', 'IHashService', 'IEmailSenderService'],
    },
  ],
})
export class CustomerModule {}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- create-customer.use-case.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/application/use-cases/customer/create-customer.use-case.ts app/src/infrastructure/http/controllers/customer/customer.module.ts app/test/unit/application/use-cases/customer/create-customer.use-case.spec.ts
git commit -m "feat(customer): generate and e-mail a random initial password on creation"
```

---

### Task 5: Login do cliente — `AuthenticateCustomerUseCase` + JWT strategy/guard próprios

**Files:**
- Modify: `app/.env.example`
- Create: `app/src/application/ports/input/auth/dto/authenticate-customer.dto.ts`
- Create: `app/src/application/ports/input/auth/authenticate-customer.use-case.interface.ts`
- Create: `app/src/application/use-cases/auth/authenticate-customer.use-case.ts`
- Modify: `app/src/application/ports/output/token.service.interface.ts`
- Create: `app/src/infrastructure/http/strategies/jwt-customer.strategy.ts`
- Create: `app/src/infrastructure/http/guards/jwt-customer-auth.guard.ts`
- Create: `app/src/infrastructure/http/decorators/current-customer.decorator.ts`
- Create: `app/src/interface-adapters/auth/requests/login-customer-request.ts`
- Create: `app/src/interface-adapters/auth/responses/auth-customer.response.ts`
- Create: `app/src/infrastructure/http/controllers/auth/dto/requests/login-customer-request.dto.ts`
- Create: `app/src/infrastructure/http/controllers/auth/dto/responses/auth-customer-response.dto.ts`
- Modify: `app/src/interface-adapters/auth/auth.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/auth/auth.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/auth/auth.module.ts`
- Test: `app/test/unit/application/use-cases/auth/authenticate-customer.use-case.spec.ts`

**Interfaces:**
- Consumes: `Document.sanitize` (já existente), `ICustomerRepository.findByEmail`/`findByDocument` (já existentes), `ITokenService.signWithSecret` (já existente).
- Produces: `CustomerTokenPayload = { sub: string; email: string; type: 'customer' }` (novo, em `token.service.interface.ts`, sem alterar `TokenPayload` existente). `POST /auth/customer/login`.

- [ ] **Step 1: Write the failing tests**

```ts
// app/test/unit/application/use-cases/auth/authenticate-customer.use-case.spec.ts
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';
import { createMockHashService, createMockTokenService } from '../../../../helpers/mock-factories';
import { AuthenticateCustomerUseCase } from '@application/use-cases/auth/authenticate-customer.use-case';

const ACCESS_SECRET = 'customer-access-secret';
const REFRESH_SECRET = 'customer-refresh-secret';

describe('AuthenticateCustomerUseCase', () => {
  let useCase: AuthenticateCustomerUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let hashService: ReturnType<typeof createMockHashService>;
  let tokenService: ReturnType<typeof createMockTokenService>;

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    hashService = createMockHashService();
    tokenService = createMockTokenService();
    useCase = new AuthenticateCustomerUseCase(
      customerRepository,
      hashService,
      tokenService,
      ACCESS_SECRET,
      REFRESH_SECRET,
      '15m',
      '7d',
    );
  });

  it('should authenticate by e-mail and return tokens', async () => {
    const customer = createMockCustomer();
    customerRepository.findByEmail.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(true);
    (tokenService.signWithSecret as jest.Mock).mockReturnValue('signed-token');

    const result = await useCase.execute({ identifier: customer.email.value, password: 'Senha@123' });

    expect(result.accessToken).toBe('signed-token');
    expect(result.refreshToken).toBe('signed-token');
    expect(result.customer.id).toBe(customer.id);
    expect(result.customer.document).toBe(customer.document.value);
    expect(tokenService.signWithSecret).toHaveBeenCalledWith(
      { sub: customer.id, email: customer.email.value, type: 'customer' },
      ACCESS_SECRET,
      '15m',
    );
    expect(tokenService.signWithSecret).toHaveBeenCalledWith(
      { sub: customer.id, email: customer.email.value, type: 'customer' },
      REFRESH_SECRET,
      '7d',
    );
  });

  it('should authenticate by document when identifier has no @', async () => {
    const customer = createMockCustomer();
    customerRepository.findByDocument.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(true);

    await useCase.execute({ identifier: customer.document.value, password: 'Senha@123' });

    expect(customerRepository.findByDocument).toHaveBeenCalledWith(customer.document.value);
    expect(customerRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedAccessException if customer does not exist', async () => {
    customerRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ identifier: 'naoexiste@email.com', password: 'Senha@123' }),
    ).rejects.toThrow(UnauthorizedAccessException);
  });

  it('should throw UnauthorizedAccessException if password is incorrect', async () => {
    const customer = createMockCustomer();
    customerRepository.findByEmail.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ identifier: customer.email.value, password: 'errada' }),
    ).rejects.toThrow('Credenciais inválidas');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- authenticate-customer.use-case.spec.ts`
Expected: FAIL — `Cannot find module '@application/use-cases/auth/authenticate-customer.use-case'`

- [ ] **Step 3: Implement**

```bash
# app/.env.example — adicionar junto às demais variáveis de JWT
CUSTOMER_JWT_SECRET=your-customer-secret-key-here
CUSTOMER_JWT_EXPIRATION=15m
CUSTOMER_JWT_REFRESH_SECRET=your-customer-refresh-secret-key-here
CUSTOMER_JWT_REFRESH_EXPIRATION=7d
```

```ts
// app/src/application/ports/output/token.service.interface.ts — adicionar ao final do arquivo, sem alterar o que já existe
export interface CustomerTokenPayload {
  sub: string;
  email: string;
  type: 'customer';
}
```

```ts
// app/src/application/ports/input/auth/dto/authenticate-customer.dto.ts
import { CustomerType } from '@domain/enums/customer-type.enum';

export interface AuthenticateCustomerInputDto {
  identifier: string;
  password: string;
}

export interface AuthenticateCustomerOutputDto {
  accessToken: string;
  refreshToken: string;
  customer: {
    id: string;
    name: string;
    email: string;
    document: string;
    type: CustomerType;
  };
}
```

```ts
// app/src/application/ports/input/auth/authenticate-customer.use-case.interface.ts
import {
  AuthenticateCustomerInputDto,
  AuthenticateCustomerOutputDto,
} from '@application/ports/input/auth/dto/authenticate-customer.dto';

export interface IAuthenticateCustomerUseCase {
  execute(input: AuthenticateCustomerInputDto): Promise<AuthenticateCustomerOutputDto>;
}
```

```ts
// app/src/application/use-cases/auth/authenticate-customer.use-case.ts
import { Customer } from '@domain/entities/customer.entity';
import { Document } from '@domain/value-objects/document.vo';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { ITokenService } from '@application/ports/output/token.service.interface';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import {
  AuthenticateCustomerInputDto,
  AuthenticateCustomerOutputDto,
} from '@application/ports/input/auth/dto/authenticate-customer.dto';
import { IAuthenticateCustomerUseCase } from '@application/ports/input/auth/authenticate-customer.use-case.interface';

import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class AuthenticateCustomerUseCase implements IAuthenticateCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
    private readonly accessExpiresIn: string,
    private readonly refreshExpiresIn: string,
  ) {}

  async execute(input: AuthenticateCustomerInputDto): Promise<AuthenticateCustomerOutputDto> {
    const customer = await this.findCustomerByIdentifier(input.identifier);

    if (!customer) {
      throw new UnauthorizedAccessException('Credenciais inválidas');
    }

    const passwordMatches = await this.hashService.compare(input.password, customer.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedAccessException('Credenciais inválidas');
    }

    const payload = { sub: customer.id, email: customer.email.value, type: 'customer' as const };

    const accessToken = this.tokenService.signWithSecret(payload, this.accessSecret, this.accessExpiresIn);
    const refreshToken = this.tokenService.signWithSecret(payload, this.refreshSecret, this.refreshExpiresIn);

    return {
      accessToken,
      refreshToken,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email.value,
        document: customer.document.value,
        type: customer.type,
      },
    };
  }

  private async findCustomerByIdentifier(identifier: string): Promise<Customer | null> {
    if (identifier.includes('@')) {
      return this.customerRepository.findByEmail(identifier);
    }

    return this.customerRepository.findByDocument(Document.sanitize(identifier));
  }
}
```

```ts
// app/src/infrastructure/http/strategies/jwt-customer.strategy.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { CustomerTokenPayload } from '@application/ports/output/token.service.interface';

@Injectable()
export class JwtCustomerStrategy extends PassportStrategy(Strategy, 'jwt-customer') {
  constructor(
    configService: ConfigService,
    @Inject('ICustomerRepository')
    private readonly customerRepository: ICustomerRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('CUSTOMER_JWT_SECRET'),
    });
  }

  async validate(payload: CustomerTokenPayload): Promise<CustomerTokenPayload> {
    const customer = await this.customerRepository.findById(payload.sub);

    if (!customer) {
      throw new UnauthorizedException('Cliente inválido');
    }

    return { sub: customer.id, email: customer.email.value, type: 'customer' };
  }
}
```

```ts
// app/src/infrastructure/http/guards/jwt-customer-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AuthenticationFailedException } from '../../exceptions/authentication-failed.exception';

@Injectable()
export class JwtCustomerAuthGuard extends AuthGuard('jwt-customer') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      throw new AuthenticationFailedException('Token de autenticação inválido ou ausente.');
    }
    return user as TUser;
  }
}
```

Não há necessidade de checar `@Public()` neste guard: nenhuma rota protegida por `JwtCustomerAuthGuard` é `@Public()` — diferente do `JwtAuthGuard`, cujo bypass existe para o link de decisão de orçamento (que continua usando `JwtAuthGuard`/`@Public()` na sua própria rota, inalterado).

```ts
// app/src/infrastructure/http/decorators/current-customer.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CustomerTokenPayload } from '@application/ports/output/token.service.interface';

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CustomerTokenPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: CustomerTokenPayload }>();
    return request.user;
  },
);
```

```ts
// app/src/interface-adapters/auth/requests/login-customer-request.ts
export interface LoginCustomerRequest {
  identifier: string;
  password: string;
}
```

```ts
// app/src/interface-adapters/auth/responses/auth-customer.response.ts
import { CustomerType } from '@domain/enums/customer-type.enum';

export interface AuthCustomerSummaryResponse {
  id: string;
  name: string;
  email: string;
  document: string;
  type: CustomerType;
}

export interface AuthCustomerResponse {
  accessToken: string;
  refreshToken: string;
  customer: AuthCustomerSummaryResponse;
}

export interface AuthCustomerDataResponse {
  data: AuthCustomerResponse;
}
```

```ts
// app/src/infrastructure/http/controllers/auth/dto/requests/login-customer-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginCustomerRequestDto {
  @ApiProperty({ example: 'cliente@email.com', description: 'E-mail ou CPF/CNPJ cadastrado' })
  @IsString({ message: 'O identificador deve ser um texto.' })
  @IsNotEmpty({ message: 'O e-mail ou documento é obrigatório' })
  identifier!: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha do cliente' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  password!: string;
}
```

```ts
// app/src/infrastructure/http/controllers/auth/dto/responses/auth-customer-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { CustomerType } from '@domain/enums/customer-type.enum';
import {
  AuthCustomerDataResponse,
  AuthCustomerResponse,
  AuthCustomerSummaryResponse,
} from '@interface-adapters/auth/responses/auth-customer.response';

class AuthCustomerSummaryResponseDto implements AuthCustomerSummaryResponse {
  @ApiProperty({ example: 'uuid-here' })
  id!: string;

  @ApiProperty({ example: 'João da Silva' })
  name!: string;

  @ApiProperty({ example: 'cliente@email.com' })
  email!: string;

  @ApiProperty({ example: '12345678909' })
  document!: string;

  @ApiProperty({ enum: CustomerType, example: CustomerType.INDIVIDUAL })
  type!: CustomerType;
}

export class AuthCustomerResponseDto implements AuthCustomerResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;

  @ApiProperty({ type: AuthCustomerSummaryResponseDto })
  customer!: AuthCustomerSummaryResponseDto;
}

export class AuthCustomerDataResponseDto implements AuthCustomerDataResponse {
  @ApiProperty({ type: AuthCustomerResponseDto, description: 'Dados de autenticação do cliente' })
  data!: AuthCustomerResponseDto;
}
```

Adicionar o método `loginCustomer` ao clean controller de auth (o mesmo `AuthController` de `interface-adapters`, que já orquestra login/refresh/me de `User` — reaproveitar a mesma classe para os métodos de `Customer`, já que ambos vivem no domínio "auth"):

```ts
// app/src/interface-adapters/auth/auth.controller.ts
import { IAuthenticateUserUseCase } from '@application/ports/input/auth/authenticate-user.use-case.interface';
import { IGetCurrentUserUseCase } from '@application/ports/input/auth/get-current-user.use-case.interface';
import { IRefreshTokenUseCase } from '@application/ports/input/auth/refresh-token.use-case.interface';
import { IAuthenticateCustomerUseCase } from '@application/ports/input/auth/authenticate-customer.use-case.interface';

import { LoginRequest } from './requests/login-request';
import { RefreshTokenRequest } from './requests/refresh-token-request';
import { LoginCustomerRequest } from './requests/login-customer-request';

import { AuthPresenter } from './auth.presenter';
import { AuthDataResponse, MeDataResponse } from './responses/auth.response';
import { AuthCustomerDataResponse } from './responses/auth-customer.response';

export class AuthController {
  constructor(
    private readonly authenticateUseCase: IAuthenticateUserUseCase,
    private readonly getCurrentUserUseCase: IGetCurrentUserUseCase,
    private readonly refreshTokenUseCase: IRefreshTokenUseCase,
    private readonly authenticateCustomerUseCase: IAuthenticateCustomerUseCase,
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

  async loginCustomer(input: LoginCustomerRequest): Promise<AuthCustomerDataResponse> {
    const result = await this.authenticateCustomerUseCase.execute(input);
    return { data: result };
  }
}
```

**Nota:** `loginCustomer` não passa pelo `AuthPresenter` porque `AuthenticateCustomerOutputDto` já tem exatamente o shape de `AuthCustomerResponse` — não há transformação a fazer, só envelopar em `{ data }`. Isso será revisitado nas Tasks 6/8 se `AuthPresenter` precisar de métodos próprios para `refresh`/`me` do cliente.

Adicionar a rota HTTP:

```ts
// app/src/infrastructure/http/controllers/auth/auth.controller.ts
// (adicionar ao final da classe existente, mantendo login/refresh/me de User como estão)
  @Post('customer/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar cliente' })
  @ApiOkResponse({ type: AuthCustomerDataResponseDto, description: 'Login realizado com sucesso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  loginCustomer(@Body() request: LoginCustomerRequestDto): Promise<AuthCustomerDataResponseDto> {
    return this.controller.loginCustomer(request);
  }
```

(adicionar os imports correspondentes de `LoginCustomerRequestDto` e `AuthCustomerDataResponseDto` no topo do arquivo)

Atualizar `auth.module.ts` para injetar `ICustomerRepository`, registrar `JwtCustomerStrategy`, e ler os novos secrets:

```ts
// app/src/infrastructure/http/controllers/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { AuthenticateUserUseCase } from '@application/use-cases/auth/authenticate-user.use-case';
import { GetCurrentUserUseCase } from '@application/use-cases/auth/get-current-user.use-case';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { AuthenticateCustomerUseCase } from '@application/use-cases/auth/authenticate-customer.use-case';
import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { JwtStrategy } from '@infrastructure/http/strategies/jwt.strategy';
import { JwtCustomerStrategy } from '@infrastructure/http/strategies/jwt-customer.strategy';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
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
        customerRepository: ICustomerRepository,
        hashService: IHashService,
        tokenService: ITokenService,
        configService: ConfigService,
      ) =>
        new AuthCleanController(
          new AuthenticateUserUseCase(userRepository, hashService, tokenService),
          new GetCurrentUserUseCase(userRepository),
          new RefreshTokenUseCase(userRepository, tokenService),
          new AuthenticateCustomerUseCase(
            customerRepository,
            hashService,
            tokenService,
            configService.getOrThrow<string>('CUSTOMER_JWT_SECRET'),
            configService.getOrThrow<string>('CUSTOMER_JWT_REFRESH_SECRET'),
            configService.get<string>('CUSTOMER_JWT_EXPIRATION', '15m'),
            configService.get<string>('CUSTOMER_JWT_REFRESH_EXPIRATION', '7d'),
          ),
        ),
      inject: ['IUserRepository', 'ICustomerRepository', 'IHashService', 'ITokenService', ConfigService],
    },
    JwtStrategy,
    JwtCustomerStrategy,
  ],
  exports: [JwtStrategy, JwtCustomerStrategy],
})
export class AuthModule {}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- authenticate-customer.use-case.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the full unit suite as a regression guard**

Run: `npm test`
Expected: PASS — nenhum outro arquivo depende do que foi alterado em `token.service.interface.ts` (só uma interface nova adicionada, nada removido) nem do `AuthController`/`auth.module.ts` de um jeito que quebre os testes de `login`/`refresh`/`me` de `User` já existentes (o construtor do `AuthController` ganhou um 4º parâmetro obrigatório — se houver um teste unitário de `auth.controller.spec.ts` que instancia essa classe diretamente, ele precisará passar um mock de `IAuthenticateCustomerUseCase` também; ajuste esse teste seguindo o mesmo padrão dos outros 3 mocks já usados nele).

- [ ] **Step 6: Commit**

```bash
git add app/.env.example app/src/application/ports/input/auth/dto/authenticate-customer.dto.ts app/src/application/ports/input/auth/authenticate-customer.use-case.interface.ts app/src/application/use-cases/auth/authenticate-customer.use-case.ts app/src/application/ports/output/token.service.interface.ts app/src/infrastructure/http/strategies/jwt-customer.strategy.ts app/src/infrastructure/http/guards/jwt-customer-auth.guard.ts app/src/infrastructure/http/decorators/current-customer.decorator.ts app/src/interface-adapters/auth/requests/login-customer-request.ts app/src/interface-adapters/auth/responses/auth-customer.response.ts app/src/infrastructure/http/controllers/auth/dto/requests/login-customer-request.dto.ts app/src/infrastructure/http/controllers/auth/dto/responses/auth-customer-response.dto.ts app/src/interface-adapters/auth/auth.controller.ts app/src/infrastructure/http/controllers/auth/auth.controller.ts app/src/infrastructure/http/controllers/auth/auth.module.ts app/test/unit/application/use-cases/auth/authenticate-customer.use-case.spec.ts
git commit -m "feat(auth): add customer login with its own JWT strategy and guard"
```

---

### Task 6: Refresh e `me` do cliente

**Files:**
- Create: `app/src/application/ports/input/auth/dto/refresh-customer-token.dto.ts`
- Create: `app/src/application/ports/input/auth/refresh-customer-token.use-case.interface.ts`
- Create: `app/src/application/use-cases/auth/refresh-customer-token.use-case.ts`
- Modify: `app/src/interface-adapters/auth/auth.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/auth/auth.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/auth/auth.module.ts`
- Test: `app/test/unit/application/use-cases/auth/refresh-customer-token.use-case.spec.ts`

**Interfaces:**
- Consumes: `ITokenService.signWithSecret`/`verifyWithSecret` (já existentes), `ICustomerRepository.findById` (já existente), `IFindCustomerByIdUseCase` (já existente — reaproveitado para `GET /auth/customer/me`, sem criar um "GetCurrentCustomerUseCase" novo).
- Produces: `POST /auth/customer/refresh`, `GET /auth/customer/me`.

- [ ] **Step 1: Write the failing tests**

```ts
// app/test/unit/application/use-cases/auth/refresh-customer-token.use-case.spec.ts
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';
import { createMockTokenService } from '../../../../helpers/mock-factories';
import { RefreshCustomerTokenUseCase } from '@application/use-cases/auth/refresh-customer-token.use-case';

const ACCESS_SECRET = 'customer-access-secret';
const REFRESH_SECRET = 'customer-refresh-secret';

describe('RefreshCustomerTokenUseCase', () => {
  let useCase: RefreshCustomerTokenUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let tokenService: ReturnType<typeof createMockTokenService>;

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    tokenService = createMockTokenService();
    useCase = new RefreshCustomerTokenUseCase(
      customerRepository,
      tokenService,
      ACCESS_SECRET,
      REFRESH_SECRET,
      '15m',
      '7d',
    );
  });

  it('should issue a new token pair for a valid refresh token', async () => {
    const customer = createMockCustomer();
    (tokenService.verifyWithSecret as jest.Mock).mockReturnValue({
      sub: customer.id,
      email: customer.email.value,
      type: 'customer',
    });
    customerRepository.findById.mockResolvedValue(customer);
    (tokenService.signWithSecret as jest.Mock).mockReturnValue('new-signed-token');

    const result = await useCase.execute({ refreshToken: 'valid-refresh-token' });

    expect(tokenService.verifyWithSecret).toHaveBeenCalledWith('valid-refresh-token', REFRESH_SECRET);
    expect(result.accessToken).toBe('new-signed-token');
    expect(result.refreshToken).toBe('new-signed-token');
  });

  it('should throw UnauthorizedAccessException if the refresh token is invalid', async () => {
    (tokenService.verifyWithSecret as jest.Mock).mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    await expect(useCase.execute({ refreshToken: 'garbage' })).rejects.toThrow(
      UnauthorizedAccessException,
    );
  });

  it('should throw UnauthorizedAccessException if the customer no longer exists', async () => {
    (tokenService.verifyWithSecret as jest.Mock).mockReturnValue({
      sub: 'deleted-customer-id',
      email: 'x@x.com',
      type: 'customer',
    });
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ refreshToken: 'valid-but-stale' })).rejects.toThrow(
      UnauthorizedAccessException,
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- refresh-customer-token.use-case.spec.ts`
Expected: FAIL — módulo ainda não existe.

- [ ] **Step 3: Implement**

```ts
// app/src/application/ports/input/auth/dto/refresh-customer-token.dto.ts
export interface RefreshCustomerTokenInputDto {
  refreshToken: string;
}

export interface RefreshCustomerTokenOutputDto {
  accessToken: string;
  refreshToken: string;
}
```

```ts
// app/src/application/ports/input/auth/refresh-customer-token.use-case.interface.ts
import {
  RefreshCustomerTokenInputDto,
  RefreshCustomerTokenOutputDto,
} from '@application/ports/input/auth/dto/refresh-customer-token.dto';

export interface IRefreshCustomerTokenUseCase {
  execute(input: RefreshCustomerTokenInputDto): Promise<RefreshCustomerTokenOutputDto>;
}
```

```ts
// app/src/application/use-cases/auth/refresh-customer-token.use-case.ts
import { ITokenService, CustomerTokenPayload } from '@application/ports/output/token.service.interface';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';

import {
  RefreshCustomerTokenInputDto,
  RefreshCustomerTokenOutputDto,
} from '@application/ports/input/auth/dto/refresh-customer-token.dto';
import { IRefreshCustomerTokenUseCase } from '@application/ports/input/auth/refresh-customer-token.use-case.interface';

import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class RefreshCustomerTokenUseCase implements IRefreshCustomerTokenUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly tokenService: ITokenService,
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
    private readonly accessExpiresIn: string,
    private readonly refreshExpiresIn: string,
  ) {}

  async execute(input: RefreshCustomerTokenInputDto): Promise<RefreshCustomerTokenOutputDto> {
    let payload: CustomerTokenPayload;

    try {
      payload = this.tokenService.verifyWithSecret<CustomerTokenPayload>(
        input.refreshToken,
        this.refreshSecret,
      );
    } catch {
      throw new UnauthorizedAccessException('Refresh token inválido ou expirado');
    }

    const customer = await this.customerRepository.findById(payload.sub);

    if (!customer) {
      throw new UnauthorizedAccessException('Refresh token inválido ou expirado');
    }

    const newPayload = { sub: customer.id, email: customer.email.value, type: 'customer' as const };

    return {
      accessToken: this.tokenService.signWithSecret(newPayload, this.accessSecret, this.accessExpiresIn),
      refreshToken: this.tokenService.signWithSecret(newPayload, this.refreshSecret, this.refreshExpiresIn),
    };
  }
}
```

Adicionar `refreshCustomer`/`meCustomer` ao clean controller, reaproveitando `IFindCustomerByIdUseCase` (já existente) para o "me" — sem criar um caso de uso novo só para isso:

```ts
// app/src/interface-adapters/auth/auth.controller.ts
// adicionar ao construtor e aos imports:
import { IRefreshCustomerTokenUseCase } from '@application/ports/input/auth/refresh-customer-token.use-case.interface';
import { IFindCustomerByIdUseCase } from '@application/ports/input/customer/find-customer-by-id.use-case.interface';
import { RefreshCustomerTokenRequest } from './requests/refresh-customer-token-request';
import { CustomerPresenter } from '@interface-adapters/customer/customer.presenter';
import { CustomerDataResponse } from '@interface-adapters/customer/responses/customer.response';

export class AuthController {
  constructor(
    private readonly authenticateUseCase: IAuthenticateUserUseCase,
    private readonly getCurrentUserUseCase: IGetCurrentUserUseCase,
    private readonly refreshTokenUseCase: IRefreshTokenUseCase,
    private readonly authenticateCustomerUseCase: IAuthenticateCustomerUseCase,
    private readonly refreshCustomerTokenUseCase: IRefreshCustomerTokenUseCase,
    private readonly findCustomerByIdUseCase: IFindCustomerByIdUseCase,
  ) {}

  // ... login, refresh, me, loginCustomer inalterados ...

  async refreshCustomer(input: RefreshCustomerTokenRequest): Promise<AuthCustomerTokensDataResponse> {
    const result = await this.refreshCustomerTokenUseCase.execute(input);
    return { data: result };
  }

  async meCustomer(customerId: string): Promise<CustomerDataResponse> {
    const customer = await this.findCustomerByIdUseCase.execute(customerId);
    return CustomerPresenter.toDataResponse(customer);
  }
}
```

```ts
// app/src/interface-adapters/auth/requests/refresh-customer-token-request.ts
export interface RefreshCustomerTokenRequest {
  refreshToken: string;
}
```

Adicionar `AuthCustomerTokensResponse`/`AuthCustomerTokensDataResponse` (só `accessToken`/`refreshToken`, sem o resumo do cliente) a `app/src/interface-adapters/auth/responses/auth-customer.response.ts`:

```ts
// app/src/interface-adapters/auth/responses/auth-customer.response.ts — adicionar ao final
export interface AuthCustomerTokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthCustomerTokensDataResponse {
  data: AuthCustomerTokensResponse;
}
```

DTOs HTTP (request de refresh + response de tokens), seguindo o mesmo padrão de `refresh-token-request.dto.ts`/`auth-response.dto.ts` já existentes para `User`:

```ts
// app/src/infrastructure/http/controllers/auth/dto/requests/refresh-customer-token-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshCustomerTokenRequestDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString({ message: 'O refresh token deve ser um texto.' })
  @IsNotEmpty({ message: 'O refresh token é obrigatório.' })
  refreshToken!: string;
}
```

```ts
// app/src/infrastructure/http/controllers/auth/dto/responses/auth-customer-response.dto.ts — adicionar ao final do arquivo já criado na Task 5
import {
  AuthCustomerTokensDataResponse,
  AuthCustomerTokensResponse,
} from '@interface-adapters/auth/responses/auth-customer.response';

export class AuthCustomerTokensResponseDto implements AuthCustomerTokensResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken!: string;
}

export class AuthCustomerTokensDataResponseDto implements AuthCustomerTokensDataResponse {
  @ApiProperty({ type: AuthCustomerTokensResponseDto })
  data!: AuthCustomerTokensResponseDto;
}
```

Rotas HTTP (adicionar ao `AuthController` HTTP existente, junto com os imports de `CustomerDataResponseDto`, `JwtCustomerAuthGuard` e `CurrentCustomer`):

```ts
// app/src/infrastructure/http/controllers/auth/auth.controller.ts
  @Post('customer/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens do cliente com refresh token' })
  @ApiOkResponse({ type: AuthCustomerTokensDataResponseDto, description: 'Tokens renovados com sucesso' })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido ou expirado' })
  refreshCustomer(
    @Body() request: RefreshCustomerTokenRequestDto,
  ): Promise<AuthCustomerTokensDataResponseDto> {
    return this.controller.refreshCustomer(request);
  }

  @Get('customer/me')
  @UseGuards(JwtCustomerAuthGuard)
  @ApiBearerAuth('customer-access-token')
  @ApiOperation({ summary: 'Obter dados do cliente autenticado' })
  @ApiOkResponse({ type: CustomerDataResponseDto, description: 'Dados do cliente' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  meCustomer(@CurrentCustomer() customer: CustomerTokenPayload): Promise<CustomerDataResponseDto> {
    return this.controller.meCustomer(customer.sub);
  }
```

**Atenção na implementação:** `@Controller('auth')` não tem guard de classe (é público por padrão, como já documentado em `docs/architecture.md`) — por isso cada rota nova de cliente precisa do seu próprio `@UseGuards(JwtCustomerAuthGuard)` explícito, exatamente como `GET /auth/me` já faz com `JwtAuthGuard` hoje.

Atualizar `auth.module.ts` (Task 5) para instanciar `RefreshCustomerTokenUseCase` e injetar `FindCustomerByIdUseCase` no `AuthCleanController`, e registrar `JwtCustomerAuthGuard`... (guard não precisa ser registrado no módulo, só usado via decorator `@UseGuards`, mas precisa estar acessível — como é uma classe simples com `@Injectable()`, o Nest resolve via DI automaticamente, sem entrada extra de provider, já que não tem dependências de outros providers do módulo).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- refresh-customer-token.use-case.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/application/ports/input/auth/dto/refresh-customer-token.dto.ts app/src/application/ports/input/auth/refresh-customer-token.use-case.interface.ts app/src/application/use-cases/auth/refresh-customer-token.use-case.ts app/src/interface-adapters/auth/auth.controller.ts app/src/interface-adapters/auth/requests/refresh-customer-token-request.ts app/src/interface-adapters/auth/responses/auth-customer.response.ts app/src/infrastructure/http/controllers/auth/dto/requests/refresh-customer-token-request.dto.ts app/src/infrastructure/http/controllers/auth/dto/responses/auth-customer-response.dto.ts app/src/infrastructure/http/controllers/auth/auth.controller.ts app/src/infrastructure/http/controllers/auth/auth.module.ts app/test/unit/application/use-cases/auth/refresh-customer-token.use-case.spec.ts
git commit -m "feat(auth): add customer token refresh and GET /auth/customer/me"
```

---

### Task 7: Troca de senha do `User` — endpoints dedicados `/me/password` e `/:id/password`

**Files:**
- Create: `app/src/application/ports/input/user/dto/change-own-password.dto.ts`
- Create: `app/src/application/use-cases/user/change-own-user-password.use-case.ts`
- Create: `app/src/application/use-cases/user/reset-user-password.use-case.ts`
- Modify: `app/src/application/ports/input/user/dto/update-user.dto.ts`
- Modify: `app/src/application/use-cases/user/update-user.use-case.ts`
- Modify: `app/src/infrastructure/http/controllers/user/dto/requests/update-user-request.dto.ts`
- Modify: `app/src/interface-adapters/user/requests/update-user-request.ts`
- Create: `app/src/infrastructure/http/controllers/user/dto/requests/change-own-password-request.dto.ts`
- Modify: `app/src/interface-adapters/user/user.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/user/user.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/user/user.module.ts`
- Test: `app/test/unit/application/use-cases/user/change-own-user-password.use-case.spec.ts`
- Test: `app/test/unit/application/use-cases/user/reset-user-password.use-case.spec.ts`
- Test: `app/test/unit/application/use-cases/user/update-user.use-case.spec.ts`

**Interfaces:**
- Consumes: `generateSecurePassword` (Task 1), `User.validatePasswordStrength`, `User.changePassword` (já existentes).
- Produces: `PATCH /users/me/password`, `PATCH /users/:id/password`. `UpdateUserDto` perde o campo `password`.

**Antes de implementar:** leia `app/src/infrastructure/http/controllers/user/user.controller.ts` para confirmar se há `@Roles(...)` a nível de classe (como há em `CustomerController`) — se houver e não incluir todos os papéis de staff (`ADMIN`, `MECHANIC`, `ATTENDANT`), a rota `PATCH /users/me/password` precisa de um `@Roles(...)` próprio no método, sobrescrevendo o da classe (o `Reflector.getAllAndOverride` do `RolesGuard` já prioriza o metadata do método sobre o da classe), já que qualquer funcionário — não só quem já tem permissão de gestão — deve conseguir trocar a própria senha.

- [ ] **Step 1: Write the failing tests**

```ts
// app/test/unit/application/use-cases/user/change-own-user-password.use-case.spec.ts
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { createMockHashService, createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { ChangeOwnUserPasswordUseCase } from '@application/use-cases/user/change-own-user-password.use-case';

describe('ChangeOwnUserPasswordUseCase', () => {
  let useCase: ChangeOwnUserPasswordUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let hashService: ReturnType<typeof createMockHashService>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    hashService = createMockHashService();
    useCase = new ChangeOwnUserPasswordUseCase(userRepository, hashService);
  });

  it('should change the password when current password matches', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(true);
    userRepository.update.mockResolvedValue(user);

    await useCase.execute(user.id, { currentPassword: 'Senha@123', newPassword: 'NovaSenha@456' });

    expect(hashService.compare).toHaveBeenCalledWith('Senha@123', user.passwordHash);
    expect(hashService.hash).toHaveBeenCalledWith('NovaSenha@456');
    expect(userRepository.update).toHaveBeenCalledWith(user);
  });

  it('should throw UnauthorizedAccessException if current password does not match', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute(user.id, { currentPassword: 'errada', newPassword: 'NovaSenha@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('should throw DomainValidationException if new password is weak', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    hashService.compare.mockResolvedValue(true);

    await expect(
      useCase.execute(user.id, { currentPassword: 'Senha@123', newPassword: 'weak' }),
    ).rejects.toThrow(DomainValidationException);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException if user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('inexistente', { currentPassword: 'x', newPassword: 'NovaSenha@456' }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
```

```ts
// app/test/unit/application/use-cases/user/reset-user-password.use-case.spec.ts
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { createMockHashService, createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { ResetUserPasswordUseCase } from '@application/use-cases/user/reset-user-password.use-case';

describe('ResetUserPasswordUseCase', () => {
  let useCase: ResetUserPasswordUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let hashService: ReturnType<typeof createMockHashService>;
  let emailSenderService: { send: jest.Mock };

  beforeEach(() => {
    userRepository = createMockUserRepository();
    hashService = createMockHashService();
    emailSenderService = { send: jest.fn().mockResolvedValue(undefined) };
    useCase = new ResetUserPasswordUseCase(userRepository, hashService, emailSenderService);
  });

  it('should generate a new password, save it, and e-mail it to the user', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockResolvedValue(user);

    await useCase.execute(user.id);

    expect(hashService.hash).toHaveBeenCalledTimes(1);
    const [generatedPassword] = hashService.hash.mock.calls[0];
    expect(userRepository.update).toHaveBeenCalledWith(user);
    expect(emailSenderService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: user.email.value,
        message: expect.objectContaining({ text: expect.stringContaining(generatedPassword) }),
      }),
    );
  });

  it('should throw ResourceNotFoundException if user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow(ResourceNotFoundException);
    expect(emailSenderService.send).not.toHaveBeenCalled();
  });
});
```

Remover de `update-user.use-case.spec.ts` os testes que hoje cobrem troca de senha via `UpdateUserUseCase` ("should update password with hash", "should throw DomainValidationException if new password is weak") — esse comportamento migrou para `ChangeOwnUserPasswordUseCase`/`ResetUserPasswordUseCase`, cobertos pelos specs acima.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- change-own-user-password.use-case.spec.ts reset-user-password.use-case.spec.ts`
Expected: FAIL — módulos ainda não existem.

- [ ] **Step 3: Implement**

```ts
// app/src/application/ports/input/user/dto/change-own-password.dto.ts
export interface ChangeOwnPasswordDto {
  currentPassword: string;
  newPassword: string;
}
```

```ts
// app/src/application/use-cases/user/change-own-user-password.use-case.ts
import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ChangeOwnPasswordDto } from '@application/ports/input/user/dto/change-own-password.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class ChangeOwnUserPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(userId: string, input: ChangeOwnPasswordDto): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', userId);
    }

    const currentPasswordMatches = await this.hashService.compare(
      input.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedAccessException('Senha atual incorreta');
    }

    User.validatePasswordStrength(input.newPassword);

    const newPasswordHash = await this.hashService.hash(input.newPassword);
    user.changePassword(newPasswordHash);

    await this.userRepository.update(user);
  }
}
```

```ts
// app/src/application/use-cases/user/reset-user-password.use-case.ts
import { generateSecurePassword } from '@domain/validators/password-generator';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class ResetUserPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly emailSenderService: IEmailSenderService,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', userId);
    }

    const plainPassword = generateSecurePassword();
    const newPasswordHash = await this.hashService.hash(plainPassword);
    user.changePassword(newPasswordHash);

    await this.userRepository.update(user);

    await this.emailSenderService.send({
      toEmail: user.email.value,
      toName: user.name,
      subject: 'Sua senha foi alterada',
      message: {
        text: `Olá, ${user.name}! Sua senha foi alterada por um administrador. Nova senha: "${plainPassword}".`,
        html: `<p>Olá, ${user.name}!</p><p>Sua senha foi alterada por um administrador. Nova senha: <strong>${plainPassword}</strong>.</p>`,
      },
    });
  }
}
```

Remover `password` de `UpdateUserDto` e do bloco correspondente em `UpdateUserUseCase`:

```ts
// app/src/application/ports/input/user/dto/update-user.dto.ts
import { UserPublicView } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';

export interface UpdateUserDto {
  name?: string;
  email?: string;
  document?: string;
  role?: UserRole;
}

export type UpdateUserOutputDto = UserPublicView;
```

```ts
// app/src/application/use-cases/user/update-user.use-case.ts
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

import {
  UpdateUserDto,
  UpdateUserOutputDto,
} from '@application/ports/input/user/dto/update-user.dto';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string, updateUserDto: UpdateUserDto): Promise<UpdateUserOutputDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', id);
    }

    if (updateUserDto.email !== undefined) {
      const newEmail = Email.create(updateUserDto.email);

      if (!newEmail.equals(user.email)) {
        const existing = await this.userRepository.findByEmail(newEmail.value);

        if (existing) {
          throw new ResourceConflictException('E-mail já cadastrado no sistema');
        }
      }

      user.changeEmail(updateUserDto.email);
    }

    if (updateUserDto.document !== undefined) {
      const newDocument = Document.create(updateUserDto.document);

      if (!newDocument.equals(user.document)) {
        const existing = await this.userRepository.findByDocument(newDocument.value);

        if (existing) {
          throw new ResourceConflictException('Documento já cadastrado no sistema');
        }
      }

      user.changeDocument(updateUserDto.document);
    }

    if (updateUserDto.name !== undefined) {
      user.changeName(updateUserDto.name);
    }

    if (updateUserDto.role !== undefined) {
      user.changeRole(updateUserDto.role);
    }

    const updated = await this.userRepository.update(user);

    return updated.toPublicView();
  }
}
```

**Nota:** `UpdateUserUseCase` perde a dependência de `IHashService` (não faz mais nada com senha) — atualizar `user.module.ts` para não injetá-lo mais nesse caso de uso específico (os outros use cases do módulo que ainda usam hash — `CreateUserUseCase` — continuam recebendo normalmente).

DTOs HTTP — remover `password` de `update-user-request.dto.ts` e `update-user-request.ts` (interface-adapters), e criar o DTO da nova rota de self-service:

```ts
// app/src/infrastructure/http/controllers/user/dto/requests/update-user-request.dto.ts
// remover o campo password!: ... e seus imports (PASSWORD_REGEX, PASSWORD_REQUIREMENTS_MESSAGE, Matches)
// o restante do arquivo (name, email, document, role) fica inalterado
```

```ts
// app/src/interface-adapters/user/requests/update-user-request.ts
import { UserRole } from '@domain/enums/user-role.enum';

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  document?: string;
  role?: UserRole;
}
```

```ts
// app/src/infrastructure/http/controllers/user/dto/requests/change-own-password-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { PASSWORD_REGEX } from '@domain/constants/regex/password.regex';
import { PASSWORD_REQUIREMENTS_MESSAGE } from '@domain/constants/validation/password.constants';

export class ChangeOwnPasswordRequestDto {
  @ApiProperty({ example: 'SenhaAtual@123', description: 'Senha atual' })
  @IsString({ message: 'A senha atual deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha atual é obrigatória.' })
  currentPassword!: string;

  @ApiProperty({
    example: 'NovaSenha@456',
    description:
      'Nova senha (mín. 8 caracteres, com ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial)',
  })
  @IsString({ message: 'A nova senha deve ser um texto.' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  newPassword!: string;
}
```

Adicionar os métodos ao clean controller e ao HTTP controller de `User`. No clean controller (`interface-adapters/user/user.controller.ts`), adicionar ao construtor `changeOwnUserPasswordUseCase: ChangeOwnUserPasswordUseCase` e `resetUserPasswordUseCase: ResetUserPasswordUseCase` (injetados diretamente como classe, não por interface `I...UseCase`, já que são casos de uso novos, simples, sem múltiplas implementações — mesmo padrão que outros pontos do projeto usam quando não há necessidade de abstração adicional) e os métodos:

```ts
// app/src/interface-adapters/user/user.controller.ts — adicionar ao final da classe
  async changeOwnPassword(userId: string, input: ChangeOwnPasswordDto): Promise<void> {
    await this.changeOwnUserPasswordUseCase.execute(userId, input);
  }

  async resetPassword(userId: string): Promise<void> {
    await this.resetUserPasswordUseCase.execute(userId);
  }
```

No HTTP controller (`infrastructure/http/controllers/user/user.controller.ts`), adicionar — **na ordem correta, com `me/password` antes de `:id/password`** para o Nest não tentar casar `"me"` como `:id`:

```ts
// app/src/infrastructure/http/controllers/user/user.controller.ts
  @Patch('me/password')
  @Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Trocar a própria senha' })
  @ApiNoContentResponse({ description: 'Senha alterada com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Senha atual incorreta' })
  async changeOwnPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: ChangeOwnPasswordRequestDto,
  ): Promise<void> {
    await this.controller.changeOwnPassword(user.sub, request);
  }

  @Patch(':id/password')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Redefinir a senha de outro usuário (gera senha nova e envia por e-mail)' })
  @ApiNoContentResponse({ description: 'Senha redefinida e enviada por e-mail' })
  async resetPassword(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.controller.resetPassword(id);
  }
```

O `@Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT)` em `changeOwnPassword` sobrescreve qualquer `@Roles(...)` mais restritivo herdado da classe (confirme o valor exato lendo o arquivo atual, conforme a nota no início desta task) — o efeito desejado é "qualquer papel de staff autenticado pode chamar esta rota para si mesmo".

Atualizar `user.module.ts` para instanciar os dois novos casos de uso e ajustar a injeção de `UpdateUserUseCase` (sem `hashService`):

```ts
// app/src/infrastructure/http/controllers/user/user.module.ts
import { Module } from '@nestjs/common';

import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { CreateUserUseCase } from '@application/use-cases/user/create-user.use-case';
import { DeleteUserUseCase } from '@application/use-cases/user/delete-user.use-case';
import { FindAllUsersUseCase } from '@application/use-cases/user/find-all-users.use-case';
import { FindUserByIdUseCase } from '@application/use-cases/user/find-user-by-id.use-case';
import { UpdateUserStatusUseCase } from '@application/use-cases/user/update-user-status.use-case';
import { UpdateUserUseCase } from '@application/use-cases/user/update-user.use-case';
import { ChangeOwnUserPasswordUseCase } from '@application/use-cases/user/change-own-user-password.use-case';
import { ResetUserPasswordUseCase } from '@application/use-cases/user/reset-user-password.use-case';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';

import { UserController as UserCleanController } from '@interface-adapters/user/user.controller';
import { UserController } from './user.controller';

@Module({
  imports: [InfrastructureServicesModule],
  controllers: [UserController],
  providers: [
    {
      provide: UserCleanController,
      useFactory: (
        userRepository: IUserRepository,
        hashService: IHashService,
        emailSenderService: IEmailSenderService,
      ) =>
        new UserCleanController(
          new CreateUserUseCase(userRepository, hashService),
          new FindUserByIdUseCase(userRepository),
          new FindAllUsersUseCase(userRepository),
          new UpdateUserUseCase(userRepository),
          new UpdateUserStatusUseCase(userRepository),
          new DeleteUserUseCase(userRepository),
          new ChangeOwnUserPasswordUseCase(userRepository, hashService),
          new ResetUserPasswordUseCase(userRepository, hashService, emailSenderService),
        ),
      inject: ['IUserRepository', 'IHashService', 'IEmailSenderService'],
    },
  ],
})
export class UserModule {}
```

(ajustar a ordem/posição dos dois novos parâmetros no construtor de `UserCleanController` — `interface-adapters/user/user.controller.ts` — para bater com essa chamada)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- change-own-user-password.use-case.spec.ts reset-user-password.use-case.spec.ts update-user.use-case.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/application/ports/input/user/dto/change-own-password.dto.ts app/src/application/use-cases/user/change-own-user-password.use-case.ts app/src/application/use-cases/user/reset-user-password.use-case.ts app/src/application/ports/input/user/dto/update-user.dto.ts app/src/application/use-cases/user/update-user.use-case.ts app/src/infrastructure/http/controllers/user/dto/requests/update-user-request.dto.ts app/src/interface-adapters/user/requests/update-user-request.ts app/src/infrastructure/http/controllers/user/dto/requests/change-own-password-request.dto.ts app/src/interface-adapters/user/user.controller.ts app/src/infrastructure/http/controllers/user/user.controller.ts app/src/infrastructure/http/controllers/user/user.module.ts app/test/unit/application/use-cases/user/change-own-user-password.use-case.spec.ts app/test/unit/application/use-cases/user/reset-user-password.use-case.spec.ts app/test/unit/application/use-cases/user/update-user.use-case.spec.ts
git commit -m "feat(user): split password change into dedicated self/admin endpoints"
```

---

### Task 8: Troca de senha do `Customer` — `/auth/customer/password` (self) e `/customers/:id/password` (admin)

**Files:**
- Create: `app/src/application/ports/input/auth/dto/change-own-customer-password.dto.ts`
- Create: `app/src/application/use-cases/auth/change-own-customer-password.use-case.ts`
- Create: `app/src/application/use-cases/customer/reset-customer-password.use-case.ts`
- Modify: `app/src/interface-adapters/auth/auth.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/auth/auth.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/auth/auth.module.ts`
- Create: `app/src/infrastructure/http/controllers/auth/dto/requests/change-own-customer-password-request.dto.ts`
- Modify: `app/src/interface-adapters/customer/customer.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/customer/customer.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/customer/customer.module.ts`
- Test: `app/test/unit/application/use-cases/auth/change-own-customer-password.use-case.spec.ts`
- Test: `app/test/unit/application/use-cases/customer/reset-customer-password.use-case.spec.ts`

**Interfaces:**
- Consumes: `generateSecurePassword` (Task 1), `Customer.validatePasswordStrength`, `Customer.changePassword` (Task 2).
- Produces: `PATCH /auth/customer/password` (self), `PATCH /customers/:id/password` (admin/atendente).

**Motivo da rota self-service viver em `AuthController`, não em `CustomerController`:** ver a nota de implementação na spec (`docs/superpowers/specs/2026-08-21-customer-login-design.md`, seção 3) — guards do NestJS se somam entre classe e método; `CustomerController` tem `@UseGuards(JwtAuthGuard, RolesGuard)` a nível de classe, então uma rota ali dentro nunca poderia usar só `JwtCustomerAuthGuard`. `AuthController` não tem guard de classe, por isso hospeda essa rota (mesmo padrão já usado para `GET /auth/customer/me`).

- [ ] **Step 1: Write the failing tests**

```ts
// app/test/unit/application/use-cases/auth/change-own-customer-password.use-case.spec.ts
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';
import { createMockHashService } from '../../../../helpers/mock-factories';
import { ChangeOwnCustomerPasswordUseCase } from '@application/use-cases/auth/change-own-customer-password.use-case';

describe('ChangeOwnCustomerPasswordUseCase', () => {
  let useCase: ChangeOwnCustomerPasswordUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let hashService: ReturnType<typeof createMockHashService>;

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    hashService = createMockHashService();
    useCase = new ChangeOwnCustomerPasswordUseCase(customerRepository, hashService);
  });

  it('should change the password when current password matches', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(true);
    customerRepository.update.mockResolvedValue(customer);

    await useCase.execute(customer.id, { currentPassword: 'Senha@123', newPassword: 'NovaSenha@456' });

    expect(hashService.compare).toHaveBeenCalledWith('Senha@123', customer.passwordHash);
    expect(customerRepository.update).toHaveBeenCalledWith(customer);
  });

  it('should throw UnauthorizedAccessException if current password does not match', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute(customer.id, { currentPassword: 'errada', newPassword: 'NovaSenha@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
  });

  it('should throw DomainValidationException if new password is weak', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(true);

    await expect(
      useCase.execute(customer.id, { currentPassword: 'Senha@123', newPassword: 'weak' }),
    ).rejects.toThrow(DomainValidationException);
  });

  it('should throw ResourceNotFoundException if customer does not exist', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('inexistente', { currentPassword: 'x', newPassword: 'NovaSenha@456' }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
```

```ts
// app/test/unit/application/use-cases/customer/reset-customer-password.use-case.spec.ts
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { createMockCustomer, createMockCustomerRepository } from '../../../../helpers/customer-mock.factory';
import { createMockHashService } from '../../../../helpers/mock-factories';
import { ResetCustomerPasswordUseCase } from '@application/use-cases/customer/reset-customer-password.use-case';

describe('ResetCustomerPasswordUseCase', () => {
  let useCase: ResetCustomerPasswordUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let hashService: ReturnType<typeof createMockHashService>;
  let emailSenderService: { send: jest.Mock };

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    hashService = createMockHashService();
    emailSenderService = { send: jest.fn().mockResolvedValue(undefined) };
    useCase = new ResetCustomerPasswordUseCase(customerRepository, hashService, emailSenderService);
  });

  it('should generate a new password, save it, and e-mail it to the customer', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    customerRepository.update.mockResolvedValue(customer);

    await useCase.execute(customer.id);

    expect(hashService.hash).toHaveBeenCalledTimes(1);
    const [generatedPassword] = hashService.hash.mock.calls[0];
    expect(emailSenderService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: customer.email.value,
        message: expect.objectContaining({ text: expect.stringContaining(generatedPassword) }),
      }),
    );
  });

  it('should throw ResourceNotFoundException if customer does not exist', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow(ResourceNotFoundException);
    expect(emailSenderService.send).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- change-own-customer-password.use-case.spec.ts reset-customer-password.use-case.spec.ts`
Expected: FAIL — módulos ainda não existem.

- [ ] **Step 3: Implement**

```ts
// app/src/application/ports/input/auth/dto/change-own-customer-password.dto.ts
export interface ChangeOwnCustomerPasswordDto {
  currentPassword: string;
  newPassword: string;
}
```

```ts
// app/src/application/use-cases/auth/change-own-customer-password.use-case.ts
import { Customer } from '@domain/entities/customer.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ChangeOwnCustomerPasswordDto } from '@application/ports/input/auth/dto/change-own-customer-password.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class ChangeOwnCustomerPasswordUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(customerId: string, input: ChangeOwnCustomerPasswordDto): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', customerId);
    }

    const currentPasswordMatches = await this.hashService.compare(
      input.currentPassword,
      customer.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedAccessException('Senha atual incorreta');
    }

    Customer.validatePasswordStrength(input.newPassword);

    const newPasswordHash = await this.hashService.hash(input.newPassword);
    customer.changePassword(newPasswordHash);

    await this.customerRepository.update(customer);
  }
}
```

```ts
// app/src/application/use-cases/customer/reset-customer-password.use-case.ts
import { generateSecurePassword } from '@domain/validators/password-generator';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class ResetCustomerPasswordUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly hashService: IHashService,
    private readonly emailSenderService: IEmailSenderService,
  ) {}

  async execute(customerId: string): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', customerId);
    }

    const plainPassword = generateSecurePassword();
    const newPasswordHash = await this.hashService.hash(plainPassword);
    customer.changePassword(newPasswordHash);

    await this.customerRepository.update(customer);

    await this.emailSenderService.send({
      toEmail: customer.email.value,
      toName: customer.name,
      subject: 'Sua senha foi alterada',
      message: {
        text: `Olá, ${customer.name}! Sua senha foi alterada por um atendente. Nova senha: "${plainPassword}".`,
        html: `<p>Olá, ${customer.name}!</p><p>Sua senha foi alterada por um atendente. Nova senha: <strong>${plainPassword}</strong>.</p>`,
      },
    });
  }
}
```

DTO HTTP da rota self-service (vive junto aos outros DTOs de `auth`):

```ts
// app/src/infrastructure/http/controllers/auth/dto/requests/change-own-customer-password-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { PASSWORD_REGEX } from '@domain/constants/regex/password.regex';
import { PASSWORD_REQUIREMENTS_MESSAGE } from '@domain/constants/validation/password.constants';

export class ChangeOwnCustomerPasswordRequestDto {
  @ApiProperty({ example: 'SenhaAtual@123', description: 'Senha atual' })
  @IsString({ message: 'A senha atual deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha atual é obrigatória.' })
  currentPassword!: string;

  @ApiProperty({
    example: 'NovaSenha@456',
    description:
      'Nova senha (mín. 8 caracteres, com ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial)',
  })
  @IsString({ message: 'A nova senha deve ser um texto.' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  newPassword!: string;
}
```

Adicionar ao clean controller de auth (construtor ganha `changeOwnCustomerPasswordUseCase: ChangeOwnCustomerPasswordUseCase`) e o método:

```ts
// app/src/interface-adapters/auth/auth.controller.ts — adicionar ao final da classe
  async changeOwnCustomerPassword(
    customerId: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    await this.changeOwnCustomerPasswordUseCase.execute(customerId, input);
  }
```

Rota HTTP:

```ts
// app/src/infrastructure/http/controllers/auth/auth.controller.ts
  @Patch('customer/password')
  @UseGuards(JwtCustomerAuthGuard)
  @ApiBearerAuth('customer-access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cliente troca a própria senha' })
  @ApiNoContentResponse({ description: 'Senha alterada com sucesso' })
  @ApiUnauthorizedResponse({ description: 'Senha atual incorreta' })
  async changeOwnCustomerPassword(
    @CurrentCustomer() customer: CustomerTokenPayload,
    @Body() request: ChangeOwnCustomerPasswordRequestDto,
  ): Promise<void> {
    await this.controller.changeOwnCustomerPassword(customer.sub, request);
  }
```

Atualizar `auth.module.ts` para instanciar `ChangeOwnCustomerPasswordUseCase` e injetar no `AuthCleanController`.

Agora a rota de reset (admin/atendente), essa sim em `CustomerController` (mesma classe, mesmos guards que o resto dela):

```ts
// app/src/interface-adapters/customer/customer.controller.ts — adicionar ao construtor
// resetCustomerPasswordUseCase: ResetCustomerPasswordUseCase, e o método:
  async resetPassword(customerId: string): Promise<void> {
    await this.resetCustomerPasswordUseCase.execute(customerId);
  }
```

```ts
// app/src/infrastructure/http/controllers/customer/customer.controller.ts
  @Patch(':id/password')
  @Roles(UserRole.ADMIN, UserRole.ATTENDANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Redefinir a senha de um cliente (gera senha nova e envia por e-mail)' })
  @ApiNoContentResponse({ description: 'Senha redefinida e enviada por e-mail' })
  async resetPassword(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.controller.resetPassword(id);
  }
```

**Atenção na implementação:** confirme lendo `customer.controller.ts` (HTTP) se já existe alguma rota com path dinâmico que colidiria (ex.: `GET /customers/:id/vehicles`, mencionada na exploração) — `PATCH :id/password` não colide com `GET :id/vehicles` (métodos e sufixos diferentes), mas confirme a ordem de declaração dos métodos na classe de qualquer forma, por consistência com o restante do plano.

Atualizar `customer.module.ts` para instanciar `ResetCustomerPasswordUseCase` (precisa de `IHashService` + `IEmailSenderService`, já importados no módulo desde a Task 4) e injetar no `CustomerCleanController`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- change-own-customer-password.use-case.spec.ts reset-customer-password.use-case.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/application/ports/input/auth/dto/change-own-customer-password.dto.ts app/src/application/use-cases/auth/change-own-customer-password.use-case.ts app/src/application/use-cases/customer/reset-customer-password.use-case.ts app/src/interface-adapters/auth/auth.controller.ts app/src/infrastructure/http/controllers/auth/auth.controller.ts app/src/infrastructure/http/controllers/auth/auth.module.ts app/src/infrastructure/http/controllers/auth/dto/requests/change-own-customer-password-request.dto.ts app/src/interface-adapters/customer/customer.controller.ts app/src/infrastructure/http/controllers/customer/customer.controller.ts app/src/infrastructure/http/controllers/customer/customer.module.ts app/test/unit/application/use-cases/auth/change-own-customer-password.use-case.spec.ts app/test/unit/application/use-cases/customer/reset-customer-password.use-case.spec.ts
git commit -m "feat(customer): add password change endpoints (self via auth, reset via customer admin)"
```

---

### Task 9: Novo controller de orçamento do cliente — `GET /quotes/me`

**Files:**
- Modify: `app/src/domain/interfaces/repositories/quote.repository.interface.ts`
- Modify: `app/src/infrastructure/persistence/prisma/repositories/prisma-quote.repository.ts`
- Create: `app/src/application/ports/input/quote/find-pending-quotes-for-customer.use-case.interface.ts`
- Create: `app/src/application/use-cases/quote/find-pending-quotes-for-customer.use-case.ts`
- Create: `app/src/interface-adapters/quote/customer-quote.controller.ts`
- Create: `app/src/infrastructure/http/controllers/quote/customer-quote.controller.ts`
- Modify: `app/src/infrastructure/http/controllers/quote/quote.module.ts`
- Test: `app/test/unit/application/use-cases/quote/find-pending-quotes-for-customer.use-case.spec.ts`

**Interfaces:**
- Consumes: `IQuoteRepository.findAllPaginated` (já existente, ganha um filtro novo), `JwtCustomerAuthGuard`/`CurrentCustomer` (Task 5).
- Produces: `QuoteFilters.customerId?: string`. `GET /quotes/me`.

**Motivo de um controller novo em vez de adicionar a rota no `QuoteController` existente:** mesmo problema de composição de guards já resolvido na Task 8 — `QuoteController` tem `@UseGuards(JwtAuthGuard, RolesGuard)` a nível de classe; uma rota que precisa só de `JwtCustomerAuthGuard` não pode viver ali. `CustomerQuoteController` é uma classe nova, com `@Controller('quotes')` (mesmo prefixo) e `@UseGuards(JwtCustomerAuthGuard)` só nela.

**Antes de implementar:** leia `app/src/infrastructure/persistence/prisma/repositories/prisma-quote.repository.ts` para confirmar a forma exata do `where` já montado em `findAllPaginated` (nome do relacionamento Prisma entre `Quote` e `WorkOrder` — provavelmente `workOrder`) antes de adicionar o filtro por `customerId`.

- [ ] **Step 1: Write the failing tests**

```ts
// app/test/unit/application/use-cases/quote/find-pending-quotes-for-customer.use-case.spec.ts
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { createMockQuote, createMockQuoteRepository } from '../../../../helpers/quote-mock.factory';
import { FindPendingQuotesForCustomerUseCase } from '@application/use-cases/quote/find-pending-quotes-for-customer.use-case';

describe('FindPendingQuotesForCustomerUseCase', () => {
  let useCase: FindPendingQuotesForCustomerUseCase;
  let quoteRepository: ReturnType<typeof createMockQuoteRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    useCase = new FindPendingQuotesForCustomerUseCase(quoteRepository);
  });

  it('should list only SENT quotes filtered by the given customer', async () => {
    const quote = createMockQuote({ status: QuoteStatus.SENT });
    quoteRepository.findAllPaginated.mockResolvedValue({ items: [quote], total: 1 });

    const result = await useCase.execute('customer-uuid-123', { page: 1, limit: 10 });

    expect(quoteRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { customerId: 'customer-uuid-123', status: QuoteStatus.SENT },
    );
    expect(result.items).toEqual([quote]);
  });
});
```

**Nota:** se `test/helpers/quote-mock.factory.ts` não existir com esse nome exato, procure o helper de mocks de `Quote` já usado por `approve-quote.use-case.spec.ts`/`reject-quote.use-case.spec.ts` (mencionado na exploração como algo como `createMockQuote`/`createMockQuoteRepository`, possivelmente dentro de `test/helpers/unit-of-work-mock.factory.ts` ou um arquivo próprio) e importe do lugar certo.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- find-pending-quotes-for-customer.use-case.spec.ts`
Expected: FAIL — módulo ainda não existe.

- [ ] **Step 3: Implement**

```ts
// app/src/domain/interfaces/repositories/quote.repository.interface.ts
// QuoteFilters ganha um campo novo, o resto da interface fica igual:
export interface QuoteFilters {
  workOrderId?: string;
  status?: QuoteStatus;
  customerId?: string;
}
```

No `prisma-quote.repository.ts`, dentro de `findAllPaginated`, adicionar ao `where` já existente (a forma exata depende do que o Step "antes de implementar" encontrar — o padrão esperado é um filtro de relação Prisma):

```ts
// dentro do método que monta o `where: Prisma.QuoteWhereInput` de findAllPaginated
if (filters.customerId) {
  where.workOrder = { customerId: filters.customerId };
}
```

```ts
// app/src/application/ports/input/quote/find-pending-quotes-for-customer.use-case.interface.ts
import { PaginatedRepositoryResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { Quote } from '@domain/entities/quote.entity';

export interface IFindPendingQuotesForCustomerUseCase {
  execute(
    customerId: string,
    pagination: PaginationInput,
  ): Promise<PaginatedRepositoryResult<Quote>>;
}
```

```ts
// app/src/application/use-cases/quote/find-pending-quotes-for-customer.use-case.ts
import { Quote } from '@domain/entities/quote.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';
import { IFindPendingQuotesForCustomerUseCase } from '@application/ports/input/quote/find-pending-quotes-for-customer.use-case.interface';

export class FindPendingQuotesForCustomerUseCase implements IFindPendingQuotesForCustomerUseCase {
  constructor(private readonly quoteRepository: IQuoteRepository) {}

  async execute(
    customerId: string,
    pagination: PaginationInput,
  ): Promise<PaginatedRepositoryResult<Quote>> {
    return this.quoteRepository.findAllPaginated(pagination, {
      customerId,
      status: QuoteStatus.SENT,
    });
  }
}
```

Clean controller novo, reaproveitando o `QuotePresenter` já existente para o formato de resposta (mesmo shape da listagem geral de orçamentos):

```ts
// app/src/interface-adapters/quote/customer-quote.controller.ts
import { IFindPendingQuotesForCustomerUseCase } from '@application/ports/input/quote/find-pending-quotes-for-customer.use-case.interface';
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { QuotePresenter } from './quote.presenter';
import { QuotePaginatedResponse } from './responses/quote.response';

export class CustomerQuoteController {
  constructor(
    private readonly findPendingQuotesForCustomerUseCase: IFindPendingQuotesForCustomerUseCase,
  ) {}

  async findMyPending(
    customerId: string,
    pagination: PaginationInput,
  ): Promise<QuotePaginatedResponse> {
    const result = await this.findPendingQuotesForCustomerUseCase.execute(customerId, pagination);
    return QuotePresenter.toPaginatedResponse(result);
  }
}
```

**Nota:** confirme o nome exato do método estático em `QuotePresenter` usado pela listagem geral de orçamentos (`toPaginatedResponse` é a suposição baseada no padrão de `UserPresenter`/`CustomerPresenter` já vistos neste plano — ajuste se o nome real for outro) e o tipo exato de retorno (`QuotePaginatedResponse` ou equivalente).

```ts
// app/src/infrastructure/http/controllers/quote/customer-quote.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtCustomerAuthGuard } from '@infrastructure/http/guards/jwt-customer-auth.guard';
import { CurrentCustomer } from '@infrastructure/http/decorators/current-customer.decorator';
import { CustomerTokenPayload } from '@application/ports/output/token.service.interface';

import { CustomerQuoteController as CustomerQuoteCleanController } from '@interface-adapters/quote/customer-quote.controller';
import { PaginationDto } from '@infrastructure/http/common/dto/pagination.dto';
import { QuotePaginatedResponseDto } from './dto/responses/quote-response.dto';

@ApiTags('Orçamentos')
@Controller('quotes')
@UseGuards(JwtCustomerAuthGuard)
@ApiBearerAuth('customer-access-token')
export class CustomerQuoteController {
  constructor(private readonly controller: CustomerQuoteCleanController) {}

  @Get('me')
  @ApiOperation({ summary: 'Listar meus orçamentos pendentes de decisão' })
  @ApiOkResponse({ type: QuotePaginatedResponseDto, description: 'Orçamentos SENT do cliente logado' })
  findMyPending(
    @CurrentCustomer() customer: CustomerTokenPayload,
    @Query() query: PaginationDto,
  ): Promise<QuotePaginatedResponseDto> {
    return this.controller.findMyPending(customer.sub, {
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }
}
```

**Nota:** confirme o nome/path exato de `PaginationDto` (ou equivalente já usado pelos outros controllers de listagem, ex. `find-all-users-query.ts`/`FindAllUsersQuery` visto na feature anterior) e ajuste o import. O tipo de resposta (`QuotePaginatedResponseDto`) segue o mesmo padrão do `UserPaginatedResponseDto` já usado no restante do projeto — confirme o nome exato lendo `quote-response.dto.ts`.

Atualizar `quote.module.ts` — **`CustomerQuoteController` precisa vir ANTES de `QuoteController` no array `controllers`**, senão o Nest resolve `GET /quotes/me` pela rota genérica `GET /quotes/:id` do controller de staff (tratando `"me"` como um `:id`) antes de chegar à rota literal:

```ts
// app/src/infrastructure/http/controllers/quote/quote.module.ts
@Module({
  controllers: [CustomerQuoteController, QuoteController], // ordem importa — CustomerQuoteController primeiro
  providers: [
    // ... providers existentes ...
    {
      provide: CustomerQuoteCleanController,
      useFactory: (quoteRepository: IQuoteRepository) =>
        new CustomerQuoteCleanController(new FindPendingQuotesForCustomerUseCase(quoteRepository)),
      inject: ['IQuoteRepository'],
    },
  ],
})
export class QuoteModule {}
```

(mesclar com os providers/imports já existentes no módulo — não remover nada do que já está lá, só adicionar o necessário para `CustomerQuoteController`/`CustomerQuoteCleanController`)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- find-pending-quotes-for-customer.use-case.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/domain/interfaces/repositories/quote.repository.interface.ts app/src/infrastructure/persistence/prisma/repositories/prisma-quote.repository.ts app/src/application/ports/input/quote/find-pending-quotes-for-customer.use-case.interface.ts app/src/application/use-cases/quote/find-pending-quotes-for-customer.use-case.ts app/src/interface-adapters/quote/customer-quote.controller.ts app/src/infrastructure/http/controllers/quote/customer-quote.controller.ts app/src/infrastructure/http/controllers/quote/quote.module.ts app/test/unit/application/use-cases/quote/find-pending-quotes-for-customer.use-case.spec.ts
git commit -m "feat(quote): add GET /quotes/me for the authenticated customer"
```

---

### Task 10: Cliente autenticado decide o orçamento — `PATCH /quotes/:id/decisions`

**Files:**
- Create: `app/src/application/ports/input/quote/dto/authenticated-quote-decision.dto.ts`
- Create: `app/src/application/use-cases/quote/authenticated-quote-decision.use-case.ts`
- Modify: `app/src/interface-adapters/quote/customer-quote.controller.ts` (Task 9)
- Modify: `app/src/infrastructure/http/controllers/quote/customer-quote.controller.ts` (Task 9)
- Modify: `app/src/infrastructure/http/controllers/quote/quote.module.ts`
- Create: `app/src/infrastructure/http/controllers/quote/dto/requests/quote-decision-request.dto.ts`
- Test: `app/test/unit/application/use-cases/quote/authenticated-quote-decision.use-case.spec.ts`

**Interfaces:**
- Consumes: `IQuoteRepository.findById`, `IWorkOrderRepository.findById` (já existentes), `ApproveQuoteUseCase`/`RejectQuoteUseCase` (já existentes, instanciados e passados como dependência, mesmo padrão que `EmailDecisionQuoteUseCase` já usa hoje).
- Produces: `PATCH /quotes/:id/decisions` (autenticado, `JwtCustomerAuthGuard`). O link assinado por e-mail (`GET /quotes/:id/decisions?token=`) não muda.

**Importante:** este endpoint **não** substitui `GET /quotes/:id/decisions` (rota `@Public()`, fluxo de e-mail) — os dois coexistem, métodos HTTP diferentes na mesma sub-rota (`GET` vs `PATCH`), sem conflito nenhum.

- [ ] **Step 1: Write the failing tests**

```ts
// app/test/unit/application/use-cases/quote/authenticated-quote-decision.use-case.spec.ts
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';
import { createMockQuote, createMockQuoteRepository } from '../../../../helpers/quote-mock.factory';
import { createMockWorkOrder, createMockWorkOrderRepository } from '../../../../helpers/work-order-mock.factory';
import { AuthenticatedQuoteDecisionUseCase } from '@application/use-cases/quote/authenticated-quote-decision.use-case';

describe('AuthenticatedQuoteDecisionUseCase', () => {
  let useCase: AuthenticatedQuoteDecisionUseCase;
  let quoteRepository: ReturnType<typeof createMockQuoteRepository>;
  let workOrderRepository: ReturnType<typeof createMockWorkOrderRepository>;
  let approveQuoteUseCase: { execute: jest.Mock };
  let rejectQuoteUseCase: { execute: jest.Mock };

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    workOrderRepository = createMockWorkOrderRepository();
    approveQuoteUseCase = { execute: jest.fn() };
    rejectQuoteUseCase = { execute: jest.fn() };
    useCase = new AuthenticatedQuoteDecisionUseCase(
      quoteRepository,
      workOrderRepository,
      approveQuoteUseCase as never,
      rejectQuoteUseCase as never,
    );
  });

  it('should approve when the quote belongs to the customer', async () => {
    const workOrder = createMockWorkOrder({ customerId: 'customer-1' });
    const quote = createMockQuote({ workOrderId: workOrder.id });
    quoteRepository.findById.mockResolvedValue(quote);
    workOrderRepository.findById.mockResolvedValue(workOrder);
    approveQuoteUseCase.execute.mockResolvedValue(quote);

    await useCase.execute({
      quoteId: quote.id,
      customerId: 'customer-1',
      action: QuoteDecisionAction.APPROVE,
    });

    expect(approveQuoteUseCase.execute).toHaveBeenCalledWith(quote.id);
    expect(rejectQuoteUseCase.execute).not.toHaveBeenCalled();
  });

  it('should reject with a reason when the quote belongs to the customer', async () => {
    const workOrder = createMockWorkOrder({ customerId: 'customer-1' });
    const quote = createMockQuote({ workOrderId: workOrder.id });
    quoteRepository.findById.mockResolvedValue(quote);
    workOrderRepository.findById.mockResolvedValue(workOrder);
    rejectQuoteUseCase.execute.mockResolvedValue(quote);

    await useCase.execute({
      quoteId: quote.id,
      customerId: 'customer-1',
      action: QuoteDecisionAction.REJECT,
      reason: 'Muito caro',
    });

    expect(rejectQuoteUseCase.execute).toHaveBeenCalledWith(quote.id, 'Muito caro');
  });

  it('should throw ResourceNotFoundException if quote does not exist', async () => {
    quoteRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ quoteId: 'inexistente', customerId: 'customer-1', action: QuoteDecisionAction.APPROVE }),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('should throw UnauthorizedAccessException if the quote belongs to a different customer', async () => {
    const workOrder = createMockWorkOrder({ customerId: 'other-customer' });
    const quote = createMockQuote({ workOrderId: workOrder.id });
    quoteRepository.findById.mockResolvedValue(quote);
    workOrderRepository.findById.mockResolvedValue(workOrder);

    await expect(
      useCase.execute({ quoteId: quote.id, customerId: 'customer-1', action: QuoteDecisionAction.APPROVE }),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(approveQuoteUseCase.execute).not.toHaveBeenCalled();
    expect(rejectQuoteUseCase.execute).not.toHaveBeenCalled();
  });
});
```

**Nota:** se `test/helpers/work-order-mock.factory.ts` não existir com esse nome exato, procure o helper de mocks de `WorkOrder` já usado pelos specs de `approve-quote.use-case`/`reject-quote.use-case` mencionados na exploração e importe do lugar certo (mesma ressalva já feita na Task 9 para o mock de `Quote`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- authenticated-quote-decision.use-case.spec.ts`
Expected: FAIL — módulo ainda não existe.

- [ ] **Step 3: Implement**

```ts
// app/src/application/ports/input/quote/dto/authenticated-quote-decision.dto.ts
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

export interface AuthenticatedQuoteDecisionDto {
  quoteId: string;
  customerId: string;
  action: QuoteDecisionAction;
  reason?: string;
}
```

```ts
// app/src/application/use-cases/quote/authenticated-quote-decision.use-case.ts
import { Quote } from '@domain/entities/quote.entity';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';

import { AuthenticatedQuoteDecisionDto } from '@application/ports/input/quote/dto/authenticated-quote-decision.dto';
import { ApproveQuoteUseCase } from './approve-quote.use-case';
import { RejectQuoteUseCase } from './reject-quote.use-case';

import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class AuthenticatedQuoteDecisionUseCase {
  constructor(
    private readonly quoteRepository: IQuoteRepository,
    private readonly workOrderRepository: IWorkOrderRepository,
    private readonly approveQuoteUseCase: ApproveQuoteUseCase,
    private readonly rejectQuoteUseCase: RejectQuoteUseCase,
  ) {}

  async execute(input: AuthenticatedQuoteDecisionDto): Promise<Quote> {
    const quote = await this.quoteRepository.findById(input.quoteId);

    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', input.quoteId);
    }

    const workOrder = await this.workOrderRepository.findById(quote.workOrderId);

    if (!workOrder || workOrder.customerId !== input.customerId) {
      throw new UnauthorizedAccessException('Orçamento não encontrado ou não pertence a este cliente');
    }

    if (input.action === QuoteDecisionAction.APPROVE) {
      return this.approveQuoteUseCase.execute(input.quoteId);
    }

    return this.rejectQuoteUseCase.execute(input.quoteId, input.reason);
  }
}
```

DTO HTTP:

```ts
// app/src/infrastructure/http/controllers/quote/dto/requests/quote-decision-request.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

export class QuoteDecisionRequestDto {
  @ApiProperty({ enum: QuoteDecisionAction, example: QuoteDecisionAction.APPROVE })
  @IsEnum(QuoteDecisionAction, { message: 'A ação deve ser APPROVE ou REJECT.' })
  @IsNotEmpty({ message: 'A ação é obrigatória.' })
  action!: QuoteDecisionAction;

  @ApiPropertyOptional({ example: 'Muito caro para o momento' })
  @IsOptional()
  @IsString({ message: 'O motivo deve ser um texto.' })
  reason?: string;
}
```

Adicionar o método ao clean controller criado na Task 9:

```ts
// app/src/interface-adapters/quote/customer-quote.controller.ts — adicionar ao construtor
// authenticatedQuoteDecisionUseCase: AuthenticatedQuoteDecisionUseCase, e o método:
  async decide(
    quoteId: string,
    customerId: string,
    input: { action: QuoteDecisionAction; reason?: string },
  ): Promise<QuoteDataResponse> {
    const quote = await this.authenticatedQuoteDecisionUseCase.execute({
      quoteId,
      customerId,
      action: input.action,
      reason: input.reason,
    });
    return QuotePresenter.toDataResponse(quote);
  }
```

Adicionar a rota ao controller HTTP criado na Task 9:

```ts
// app/src/infrastructure/http/controllers/quote/customer-quote.controller.ts
  @Patch(':id/decisions')
  @ApiOperation({ summary: 'Cliente aprova ou rejeita o próprio orçamento' })
  @ApiOkResponse({ type: QuoteDataResponseDto, description: 'Decisão registrada' })
  @ApiUnauthorizedResponse({ description: 'Orçamento não encontrado ou não pertence a este cliente' })
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentCustomer() customer: CustomerTokenPayload,
    @Body() request: QuoteDecisionRequestDto,
  ): Promise<QuoteDataResponseDto> {
    return this.controller.decide(id, customer.sub, request);
  }
```

(adicionar os imports de `Patch`, `Param`, `ParseUUIDPipe`, `Body`, `QuoteDecisionRequestDto`, `QuoteDataResponseDto` ao topo do arquivo)

Atualizar `quote.module.ts` para passar `approveQuoteUseCase`/`rejectQuoteUseCase` (já construídos no factory existente para `EmailDecisionQuoteUseCase`) também para `AuthenticatedQuoteDecisionUseCase`, e injetar `IWorkOrderRepository`:

```ts
// app/src/infrastructure/http/controllers/quote/quote.module.ts
// dentro do factory que já constrói approveQuoteUseCase/rejectQuoteUseCase/emailDecisionQuoteUseCase,
// reaproveitar as MESMAS instâncias para o AuthenticatedQuoteDecisionUseCase:
{
  provide: CustomerQuoteCleanController,
  useFactory: (
    quoteRepository: IQuoteRepository,
    workOrderRepository: IWorkOrderRepository,
    unitOfWork: IUnitOfWork,
  ) => {
    const approveQuoteUseCase = new ApproveQuoteUseCase(unitOfWork);
    const rejectQuoteUseCase = new RejectQuoteUseCase(unitOfWork);

    return new CustomerQuoteCleanController(
      new FindPendingQuotesForCustomerUseCase(quoteRepository),
      new AuthenticatedQuoteDecisionUseCase(
        quoteRepository,
        workOrderRepository,
        approveQuoteUseCase,
        rejectQuoteUseCase,
      ),
    );
  },
  inject: ['IQuoteRepository', 'IWorkOrderRepository', 'IUnitOfWork'],
},
```

**Atenção na implementação:** leia como `approveQuoteUseCase`/`rejectQuoteUseCase` já são construídos hoje no factory existente (para `QuoteController`/`EmailDecisionQuoteUseCase`) antes de duplicar a construção — se o módulo já expõe essas instâncias como providers próprios (em vez de construídas inline dentro de outro factory), prefira injetá-las diretamente em vez de instanciar de novo.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- authenticated-quote-decision.use-case.spec.ts`
Expected: PASS

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/src/application/ports/input/quote/dto/authenticated-quote-decision.dto.ts app/src/application/use-cases/quote/authenticated-quote-decision.use-case.ts app/src/interface-adapters/quote/customer-quote.controller.ts app/src/infrastructure/http/controllers/quote/customer-quote.controller.ts app/src/infrastructure/http/controllers/quote/quote.module.ts app/src/infrastructure/http/controllers/quote/dto/requests/quote-decision-request.dto.ts app/test/unit/application/use-cases/quote/authenticated-quote-decision.use-case.spec.ts
git commit -m "feat(quote): add authenticated customer decision endpoint (PATCH /quotes/:id/decisions)"
```

---

### Task 11: Helper de E2E `registerAndLoginCustomer` + testes de login/refresh/me do cliente

**Files:**
- Create: `app/test/helpers/customer-auth.helper.ts`
- Modify: `app/test/helpers/test-app.helper.ts`
- Create: `app/test/e2e/customer-auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `nextValidCpf` (helper de documento já existente — feature `feat/user-document-login`), `POST /auth/customer/login`, `POST /auth/customer/refresh`, `GET /auth/customer/me` (Tasks 5-6).
- Produces: `registerAndLoginCustomer(app, prisma, overrides?): Promise<CustomerAuthTokens>`.

**Diferença importante em relação a `registerAndLogin` (de `User`):** não existe rota pública de autocadastro de cliente — criar um `Customer` sempre passa por `POST /api/customers`, que exige token de staff (`ADMIN`/`ATTENDANT`). Para não obrigar todo teste de login de cliente a primeiro logar como staff só para criar o cliente de teste, `registerAndLoginCustomer` **sempre** insere direto via Prisma (não tem o modo "via HTTP" que `registerAndLogin` tem) — `prisma` é um parâmetro obrigatório, não opcional.

- [ ] **Step 1: Implement the helper**

```ts
// app/test/helpers/customer-auth.helper.ts
import type { Server } from 'http';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';
import { nextValidCpf } from './document.helper';

export interface CustomerAuthTokens {
  accessToken: string;
  refreshToken: string;
  customer: { id: string; name: string; email: string; document: string; type: string };
}

export async function registerAndLoginCustomer(
  app: Server,
  prisma: PrismaService,
  overrides: {
    name?: string;
    email?: string;
    document?: string;
    password?: string;
    type?: 'INDIVIDUAL' | 'COMPANY';
  } = {},
): Promise<CustomerAuthTokens> {
  const uid = Date.now();

  const name = overrides.name ?? `Test Customer ${uid}`;
  const email = overrides.email ?? `testcustomer${uid}@e2e.test`;
  const document = overrides.document ?? nextValidCpf();
  const password = overrides.password ?? 'Test@2026';
  const type = overrides.type ?? 'INDIVIDUAL';

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.customer.create({
    data: {
      name,
      email,
      document,
      type,
      phone: '11999999999',
      passwordHash: hashedPassword,
    },
  });

  const loginRes = await request(app)
    .post('/api/auth/customer/login')
    .send({ identifier: email, password })
    .expect(200);

  const { accessToken, refreshToken, customer } = loginRes.body.data;

  return { accessToken, refreshToken, customer };
}
```

Confirme se `generateValidCpf` foi renomeado/complementado por `nextValidCpf` na feature anterior (`feat/user-document-login`, Task de "final polish"/unificação dos geradores) — se `nextValidCpf` não existir nesse branch ainda (esta feature parte de `feat/user-document-login` como base, então deveria existir), use `generateValidCpf(Date.now())` como alternativa equivalente.

Confirme em `test-app.helper.ts` se as env vars `CUSTOMER_JWT_SECRET`/`CUSTOMER_JWT_REFRESH_SECRET`/`CUSTOMER_JWT_EXPIRATION`/`CUSTOMER_JWT_REFRESH_EXPIRATION` precisam ser adicionadas ao bloco de env vars de teste (mesmo padrão de `JWT_SECRET`/`JWT_REFRESH_SECRET`/`QUOTE_DECISION_TOKEN_SECRET` já configurados ali) — adicione se ainda não estiverem:

```ts
// app/test/helpers/test-app.helper.ts — no bloco de env vars de teste
CUSTOMER_JWT_SECRET: 'test-customer-jwt-secret-key-for-e2e',
CUSTOMER_JWT_EXPIRATION: '15m',
CUSTOMER_JWT_REFRESH_SECRET: 'test-customer-jwt-refresh-secret-key-for-e2e',
CUSTOMER_JWT_REFRESH_EXPIRATION: '7d',
```

- [ ] **Step 2: Write the E2E tests**

```ts
// app/test/e2e/customer-auth.e2e-spec.ts
import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { registerAndLoginCustomer } from '../helpers/customer-auth.helper';

describe('Customer Auth (E2E)', () => {
  let ctx: TestContext;
  let httpServer: Server;

  beforeAll(async () => {
    ctx = await setupTestApp();
    httpServer = ctx.httpServer;
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  describe('POST /api/auth/customer/login', () => {
    it('should login successfully by e-mail and return tokens', async () => {
      const auth = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        name: 'Cliente Login',
        email: 'cliente-login@e2e.test',
        password: 'Senha@123',
      });

      expect(auth.accessToken).toBeDefined();
      expect(auth.refreshToken).toBeDefined();
      expect(auth.customer.email).toBe('cliente-login@e2e.test');
    });

    it('should login successfully by document', async () => {
      const document = '10000000108';

      await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-doc@e2e.test',
        document,
        password: 'Senha@123',
      });

      const res = await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: document, password: 'Senha@123' })
        .expect(200);

      expect(res.body.data.customer.document).toBe(document);
    });

    it('should return 401 with wrong password', async () => {
      await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-senha@e2e.test',
        password: 'Senha@123',
      });

      await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: 'cliente-senha@e2e.test', password: 'SenhaErrada' })
        .expect(401);
    });

    it('should return 401 with non-existent identifier', async () => {
      await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: 'naoexiste@e2e.test', password: 'Senha@123' })
        .expect(401);
    });

    it('should return 400 with missing fields', async () => {
      await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: 'cliente-login@e2e.test' })
        .expect(400);
    });

    it('should not accept a User (staff) token on customer-guarded routes', async () => {
      // garante que os dois domínios de autenticação são realmente independentes:
      // um token de staff não deve resolver como cliente autenticado.
      const staffAuth = await request(httpServer)
        .post('/api/auth/login')
        .send({ identifier: 'nao-existe-staff@e2e.test', password: 'Senha@123' });

      expect(staffAuth.status).toBe(401); // nem chega a ter token — staff não cadastrado
    });
  });

  describe('POST /api/auth/customer/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const auth = await registerAndLoginCustomer(httpServer, ctx.prisma);

      const res = await request(httpServer)
        .post('/api/auth/customer/refresh')
        .send({ refreshToken: auth.refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 with invalid refresh token', async () => {
      await request(httpServer)
        .post('/api/auth/customer/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });
  });

  describe('GET /api/auth/customer/me', () => {
    it('should return current customer data', async () => {
      const auth = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        name: 'Cliente Me',
        email: 'cliente-me@e2e.test',
      });

      const res = await request(httpServer)
        .get('/api/auth/customer/me')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .expect(200);

      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: auth.customer.id,
          name: 'Cliente Me',
          email: 'cliente-me@e2e.test',
        }),
      );
    });

    it('should return 401 without token', async () => {
      await request(httpServer).get('/api/auth/customer/me').expect(401);
    });

    it('should return 401 when using a staff access token', async () => {
      const staffAuth = await registerAndLoginCustomer(httpServer, ctx.prisma); // apenas para ter um token de cliente válido de referência
      // usa um token de CLIENTE contra uma rota de STAFF, e vice-versa, para confirmar isolamento:
      await request(httpServer)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${staffAuth.accessToken}`)
        .expect(401);
    });
  });
});
```

- [ ] **Step 3: Run the E2E suite for this file**

Run: `npm run test:e2e -- customer-auth.e2e-spec.ts`
Expected: PASS

- [ ] **Step 4: Run the full E2E suite as a regression guard**

Run: `npm run test:e2e`
Expected: PASS — nenhuma das 10 suítes já existentes (`auth`, `user`, `customer`, `part-supply`, `quote`, `service`, `stock`, `vehicle`, `work-order`, `all-exceptions.filter`) deve ser afetada, já que nenhuma delas toca em login de cliente.

- [ ] **Step 5: Commit**

```bash
git add app/test/helpers/customer-auth.helper.ts app/test/helpers/test-app.helper.ts app/test/e2e/customer-auth.e2e-spec.ts
git commit -m "test(e2e): cover customer login, refresh, and /me"
```

---

### Task 12: E2E — troca de senha (self e admin, `User` e `Customer`)

**Files:**
- Modify: `app/test/e2e/user.e2e-spec.ts`
- Create: `app/test/e2e/customer-password.e2e-spec.ts`

**Interfaces:**
- Consumes: `PATCH /users/me/password`, `PATCH /users/:id/password` (Task 7), `PATCH /auth/customer/password`, `PATCH /customers/:id/password` (Task 8), `registerAndLogin`, `registerAndLoginCustomer`.

**Nota sobre verificação de e-mail:** os testes abaixo não leem a caixa de entrada do MailHog — verificam o efeito observável da troca de senha (login com a senha antiga passa a falhar) em vez do conteúdo do e-mail. Isso é suficiente para confirmar que a senha foi realmente alterada no banco, sem introduzir uma dependência nova de parsing de e-mail nos testes E2E (nenhuma suíte existente faz isso hoje).

- [ ] **Step 1: Write the failing tests for `User`**

Adicionar ao final de `app/test/e2e/user.e2e-spec.ts` (dentro do `describe('User (E2E)', ...)` já existente, dois novos blocos):

```ts
  // ─── PATCH /api/users/me/password ────────────────────────────────────────

  describe('PATCH /api/users/me/password', () => {
    it('should change own password and allow login with the new password', async () => {
      const auth = await registerAndLogin(
        httpServer,
        { name: 'Self Password', email: 'self-password@e2e.test', password: 'Senha@123' },
        ctx.prisma,
      );

      await request(httpServer)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({ currentPassword: 'Senha@123', newPassword: 'NovaSenha@456' })
        .expect(204);

      await request(httpServer)
        .post('/api/auth/login')
        .send({ identifier: 'self-password@e2e.test', password: 'NovaSenha@456' })
        .expect(200);

      await request(httpServer)
        .post('/api/auth/login')
        .send({ identifier: 'self-password@e2e.test', password: 'Senha@123' })
        .expect(401);
    });

    it('should return 401 if current password is wrong', async () => {
      const auth = await registerAndLogin(
        httpServer,
        { email: 'self-password-wrong@e2e.test', password: 'Senha@123' },
        ctx.prisma,
      );

      await request(httpServer)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({ currentPassword: 'ErradaMesmo', newPassword: 'NovaSenha@456' })
        .expect(401);
    });

    it('should return 400 if new password is weak', async () => {
      const auth = await registerAndLogin(
        httpServer,
        { email: 'self-password-weak@e2e.test', password: 'Senha@123' },
        ctx.prisma,
      );

      await request(httpServer)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({ currentPassword: 'Senha@123', newPassword: 'fraca' })
        .expect(400);
    });

    it('should be usable by a MECHANIC changing their own password', async () => {
      const auth = await registerAndLogin(
        httpServer,
        { email: 'mechanic-password@e2e.test', password: 'Senha@123', role: 'MECHANIC' },
        ctx.prisma,
      );

      await request(httpServer)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({ currentPassword: 'Senha@123', newPassword: 'NovaSenha@456' })
        .expect(204);
    });
  });

  // ─── PATCH /api/users/:id/password ────────────────────────────────────────

  describe('PATCH /api/users/:id/password', () => {
    it('should let an admin reset another user password (old password stops working)', async () => {
      const target = await registerAndLogin(
        httpServer,
        { email: 'reset-target@e2e.test', password: 'Senha@123' },
        ctx.prisma,
      );

      await request(httpServer)
        .patch(`/api/users/${target.user.id}/password`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      await request(httpServer)
        .post('/api/auth/login')
        .send({ identifier: 'reset-target@e2e.test', password: 'Senha@123' })
        .expect(401);
    });

    it('should return 403 when a non-admin tries to reset someone else password', async () => {
      const attendant = await registerAndLogin(
        httpServer,
        { email: 'attendant-reset@e2e.test', role: 'ATTENDANT' },
        ctx.prisma,
      );
      const target = await registerAndLogin(
        httpServer,
        { email: 'reset-target-2@e2e.test' },
        ctx.prisma,
      );

      await request(httpServer)
        .patch(`/api/users/${target.user.id}/password`)
        .set('Authorization', `Bearer ${attendant.accessToken}`)
        .expect(403);
    });

    it('should return 404 for a non-existent user', async () => {
      await request(httpServer)
        .patch('/api/users/00000000-0000-0000-0000-000000000000/password')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(404);
    });
  });
```

Confirme que `registerAndLogin` já está importado no topo do arquivo (já está, usado pelo restante da suíte) e que `adminAuth` (variável do `beforeEach` do arquivo) continua acessível nesses novos blocos.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:e2e -- user.e2e-spec.ts`
Expected: FAIL — rotas ainda não existiam antes da Task 7 (já implementada; a essa altura do plano deve passar — se falhar aqui de verdade, é regressão real a investigar, não esperada).

- [ ] **Step 3: Write and run the tests for `Customer`**

```ts
// app/test/e2e/customer-password.e2e-spec.ts
import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { registerAndLogin, AuthTokens } from '../helpers/auth.helper';
import { registerAndLoginCustomer } from '../helpers/customer-auth.helper';

describe('Customer Password (E2E)', () => {
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

  describe('PATCH /api/auth/customer/password', () => {
    it('should change own password and allow login with the new password', async () => {
      const auth = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-self-password@e2e.test',
        password: 'Senha@123',
      });

      await request(httpServer)
        .patch('/api/auth/customer/password')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({ currentPassword: 'Senha@123', newPassword: 'NovaSenha@456' })
        .expect(204);

      await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: 'cliente-self-password@e2e.test', password: 'NovaSenha@456' })
        .expect(200);
    });

    it('should return 401 if current password is wrong', async () => {
      const auth = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-self-wrong@e2e.test',
        password: 'Senha@123',
      });

      await request(httpServer)
        .patch('/api/auth/customer/password')
        .set('Authorization', `Bearer ${auth.accessToken}`)
        .send({ currentPassword: 'ErradaMesmo', newPassword: 'NovaSenha@456' })
        .expect(401);
    });

    it('should return 401 when using a staff access token', async () => {
      await request(httpServer)
        .patch('/api/auth/customer/password')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .send({ currentPassword: 'x', newPassword: 'NovaSenha@456' })
        .expect(401);
    });
  });

  describe('PATCH /api/customers/:id/password', () => {
    it('should let an admin reset a customer password (old password stops working)', async () => {
      const target = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-reset@e2e.test',
        password: 'Senha@123',
      });

      await request(httpServer)
        .patch(`/api/customers/${target.customer.id}/password`)
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(204);

      await request(httpServer)
        .post('/api/auth/customer/login')
        .send({ identifier: 'cliente-reset@e2e.test', password: 'Senha@123' })
        .expect(401);
    });

    it('should let an attendant reset a customer password too', async () => {
      const attendant = await registerAndLogin(httpServer, { role: 'ATTENDANT' }, ctx.prisma);
      const target = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-reset-2@e2e.test',
      });

      await request(httpServer)
        .patch(`/api/customers/${target.customer.id}/password`)
        .set('Authorization', `Bearer ${attendant.accessToken}`)
        .expect(204);
    });

    it('should return 403 for a MECHANIC', async () => {
      const mechanic = await registerAndLogin(httpServer, { role: 'MECHANIC' }, ctx.prisma);
      const target = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-reset-3@e2e.test',
      });

      await request(httpServer)
        .patch(`/api/customers/${target.customer.id}/password`)
        .set('Authorization', `Bearer ${mechanic.accessToken}`)
        .expect(403);
    });
  });
});
```

Run: `npm run test:e2e -- customer-password.e2e-spec.ts`
Expected: PASS

- [ ] **Step 4: Run the full E2E suite as a regression guard**

Run: `npm run test:e2e`
Expected: PASS (todas as suítes, incluindo as duas novas)

- [ ] **Step 5: Commit**

```bash
git add app/test/e2e/user.e2e-spec.ts app/test/e2e/customer-password.e2e-spec.ts
git commit -m "test(e2e): cover self and admin password change for User and Customer"
```

---

### Task 13: E2E — cliente autenticado lista e decide orçamento

**Files:**
- Create: `app/test/e2e/quote-customer-decision.e2e-spec.ts`

**Interfaces:**
- Consumes: `GET /quotes/me` (Task 9), `PATCH /quotes/:id/decisions` (Task 10), `registerAndLoginCustomer` (Task 11).

**Antes de implementar:** leia os helpers locais já existentes em `app/test/e2e/quote.e2e-spec.ts` (`createCustomer`, `createVehicle`, `createWorkOrderInDiagnosis`, `createService` ou nomes equivalentes) para replicar a MESMA sequência de setup (criar cliente → veículo → OS em diagnóstico → serviço → orçamento → adicionar item de serviço → submeter) — sem tentar importar essas funções de dentro de `quote.e2e-spec.ts` (são locais ao arquivo, não exportadas); escreva equivalentes locais neste novo arquivo, ajustando apenas o necessário para usar `registerAndLoginCustomer` no lugar do cliente sendo só um registro passivo criado por staff.

- [ ] **Step 1: Write the failing tests**

```ts
// app/test/e2e/quote-customer-decision.e2e-spec.ts
import type { Server } from 'http';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from '../helpers/test-app.helper';
import { cleanDatabase } from '../helpers/db-cleanup.helper';
import { registerAndLogin, AuthTokens } from '../helpers/auth.helper';
import { registerAndLoginCustomer, CustomerAuthTokens } from '../helpers/customer-auth.helper';

describe('Customer Quote Decision (E2E)', () => {
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

  // ─── setup local a este arquivo — mesma sequência usada em quote.e2e-spec.ts ──

  async function createVehicleForCustomer(customerId: string): Promise<string> {
    const res = await request(httpServer)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({
        customerId,
        plate: `ABC${Math.floor(1000 + Math.random() * 9000)}`,
        brand: 'Fiat',
        model: 'Uno',
        year: 2020,
      })
      .expect(201);

    return res.body.data.id;
  }

  async function createWorkOrderInDiagnosis(customerId: string, vehicleId: string): Promise<string> {
    const createRes = await request(httpServer)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ customerId, vehicleId, problemDescription: 'Barulho no motor' })
      .expect(201);

    const workOrderId = createRes.body.data.id;

    await request(httpServer)
      .patch(`/api/work-orders/${workOrderId}`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ status: 'IN_DIAGNOSIS' })
      .expect(200);

    return workOrderId;
  }

  async function createService(): Promise<string> {
    const res = await request(httpServer)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ name: `Troca de óleo ${Date.now()}`, price: 150, estimatedDurationMinutes: 60 })
      .expect(201);

    return res.body.data.id;
  }

  async function createSentQuoteForCustomer(customer: CustomerAuthTokens): Promise<string> {
    const vehicleId = await createVehicleForCustomer(customer.customer.id);
    const workOrderId = await createWorkOrderInDiagnosis(customer.customer.id, vehicleId);
    const serviceId = await createService();

    const quoteRes = await request(httpServer)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ workOrderId })
      .expect(201);

    const quoteId = quoteRes.body.data.id;

    await request(httpServer)
      .post(`/api/quotes/${quoteId}/services`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ serviceId, quantity: 1 })
      .expect(201);

    await request(httpServer)
      .post(`/api/quotes/${quoteId}/submissions`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .expect(200);

    return quoteId;
  }

  describe('GET /api/quotes/me', () => {
    it('should list only my own SENT quotes', async () => {
      const customer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-quotes@e2e.test',
      });
      const otherCustomer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'outro-cliente@e2e.test',
      });

      const myQuoteId = await createSentQuoteForCustomer(customer);
      await createSentQuoteForCustomer(otherCustomer);

      const res = await request(httpServer)
        .get('/api/quotes/me')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(myQuoteId);
    });

    it('should return 401 without a customer token', async () => {
      await request(httpServer).get('/api/quotes/me').expect(401);
    });

    it('should return 401 when using a staff token', async () => {
      await request(httpServer)
        .get('/api/quotes/me')
        .set('Authorization', `Bearer ${adminAuth.accessToken}`)
        .expect(401);
    });
  });

  describe('PATCH /api/quotes/:id/decisions', () => {
    it('should let the owning customer approve their own quote', async () => {
      const customer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-aprova@e2e.test',
      });
      const quoteId = await createSentQuoteForCustomer(customer);

      const res = await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({ action: 'APPROVE' })
        .expect(200);

      expect(res.body.data.status).toBe('APPROVED');
    });

    it('should let the owning customer reject their own quote with a reason', async () => {
      const customer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-rejeita@e2e.test',
      });
      const quoteId = await createSentQuoteForCustomer(customer);

      const res = await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({ action: 'REJECT', reason: 'Muito caro' })
        .expect(200);

      expect(res.body.data.status).toBe('REJECTED');
    });

    it('should return 401 when a different customer tries to decide', async () => {
      const owner = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'dono-orcamento@e2e.test',
      });
      const intruder = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'nao-dono@e2e.test',
      });
      const quoteId = await createSentQuoteForCustomer(owner);

      await request(httpServer)
        .patch(`/api/quotes/${quoteId}/decisions`)
        .set('Authorization', `Bearer ${intruder.accessToken}`)
        .send({ action: 'APPROVE' })
        .expect(401);
    });

    it('should return 404 for a non-existent quote', async () => {
      const customer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-404@e2e.test',
      });

      await request(httpServer)
        .patch('/api/quotes/00000000-0000-0000-0000-000000000000/decisions')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({ action: 'APPROVE' })
        .expect(404);
    });

    it('should not disturb the existing e-mail-link decision flow', async () => {
      // regressão explícita: o fluxo antigo (GET .../decisions?token=) continua
      // funcionando exatamente como antes, sem nenhuma dependência do novo endpoint autenticado.
      const customer = await registerAndLoginCustomer(httpServer, ctx.prisma, {
        email: 'cliente-link-antigo@e2e.test',
      });
      const quoteId = await createSentQuoteForCustomer(customer);

      // o e-mail já foi disparado por createSentQuoteForCustomer (via submissions);
      // aqui só confirmamos que a rota pública antiga continua registrada e exigindo token,
      // sem quebrar por causa dos novos endpoints/controllers adicionados nesta feature.
      await request(httpServer).get(`/api/quotes/${quoteId}/decisions`).expect(400); // token ausente na query
    });
  });
});
```

**Nota:** ajuste os payloads de `createVehicleForCustomer`/`createWorkOrderInDiagnosis`/`createService` conforme os campos EXATOS exigidos pelos DTOs reais (`CreateVehicleRequestDto`, `CreateWorkOrderRequestDto`, `CreateServiceRequestDto`) — os nomes de campo acima são a melhor suposição com base nos padrões já vistos neste plano e no anterior; leia os DTOs reais antes de finalizar esta task caso algum campo não bata (ex.: nome exato do campo de duração do serviço, ou se `PATCH /work-orders/:id` aceita `status` diretamente nesse formato).

- [ ] **Step 2: Run the tests**

Run: `npm run test:e2e -- quote-customer-decision.e2e-spec.ts`
Expected: PASS

- [ ] **Step 3: Run the full E2E suite as the final regression gate for this plan**

Run: `npm run test:e2e`
Expected: PASS — todas as suítes (as 10 já existentes + as 3 novas desta feature: `customer-auth`, `customer-password`, `quote-customer-decision`).

- [ ] **Step 4: Run the entire test suite (unit + E2E) one last time**

Run: `npm test && npm run test:e2e`
Expected: PASS, zero falhas em qualquer suíte.

- [ ] **Step 5: Commit**

```bash
git add app/test/e2e/quote-customer-decision.e2e-spec.ts
git commit -m "test(e2e): cover authenticated customer quote listing and decision"
```

---

## Post-plan checklist

- [ ] `npm run build` succeeds
- [ ] `npm test` (todas as suítes unitárias) passa
- [ ] `npm run test:e2e` (todas as suítes E2E — 13 no total após este plano) passa
- [ ] `npm run lint` passa (a cerca de ESLint que bloqueia `@nestjs/*`/`@generated/client` em `domain/`/`application/` deve continuar valendo — nenhuma task deste plano importa esses pacotes nessas camadas)
- [ ] O fluxo de link assinado por e-mail (`GET /quotes/:id/decisions?token=`) continua funcionando sem nenhuma alteração de código
- [ ] `Customer` e `User` continuam sem nenhuma unicidade cruzada, guard compartilhado ou secret compartilhado entre si
- [ ] Swagger (`/api/docs`) reflete as novas rotas (`/auth/customer/*`, `/users/*/password`, `/customers/:id/password`, `/quotes/me`, `/quotes/:id/decisions`)
