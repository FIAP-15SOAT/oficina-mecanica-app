# Documento (CPF/CNPJ) no Cadastro de Usuário e Login por Documento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `User` to be registered with a CPF/CNPJ (validated and stored exactly like `Customer` does), and allow login via e-mail **or** that document.

**Architecture:** Generalize the existing `Document` Value Object (today coupled to `Customer` via `CustomerType`) into a shared-kernel VO usable by both `User` and `Customer`, by extracting a generic `PersonType` enum and making `Document.create`'s `type` parameter optional (autodetected by length when omitted). `User` gains a `document: Document` field, `IUserRepository` gains `findByDocument`, and `AuthenticateUserUseCase` picks the lookup strategy based on whether the login `identifier` looks like an e-mail or a document.

**Tech Stack:** NestJS 11, TypeScript, Prisma (PostgreSQL), Jest (unit + Testcontainers E2E), class-validator.

**Full design rationale:** `docs/superpowers/specs/2026-08-19-user-document-login-design.md`
**Architectural decision record:** `docs/adr/0002-document-value-object-compartilhado-entre-user-e-customer.md`

## Global Constraints

- `CustomerType` and every one of its ~30 existing call sites must not change (it becomes a re-export of `PersonType`).
- `Document.create(value, type)` must behave identically to today when `type` is passed explicitly — no regression to `Customer`.
- CPF/CNPJ validation logic itself (`DocumentValidator`) is never modified.
- `User.document` is required and unique from day one — no nullable transition column (project is not in production yet).
- No cross-table uniqueness between `User.document` and `Customer.document` (tables have no relation).
- Login failures (identifier not found, wrong password, inactive user, malformed identifier) all return the same generic `"Credenciais inválidas"` (401) — never leak which part failed.
- All commands below run from `app/` (the NestJS project root), unless stated otherwise.

---

### Task 1: Extract `PersonType` enum; `CustomerType` becomes a re-export

**Files:**
- Create: `app/src/domain/enums/person-type.enum.ts`
- Modify: `app/src/domain/enums/customer-type.enum.ts`
- Test: `app/test/unit/domain/enums/person-type.enum.spec.ts`

**Interfaces:**
- Produces: `PersonType.INDIVIDUAL`, `PersonType.COMPANY` (importable from `@domain/enums/person-type.enum`). `CustomerType` (from `@domain/enums/customer-type.enum`) remains importable with identical values — it is now literally the same object as `PersonType`.

- [ ] **Step 1: Write the failing test**

```ts
// app/test/unit/domain/enums/person-type.enum.spec.ts
import { PersonType } from '@domain/enums/person-type.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';

describe('PersonType / CustomerType', () => {
  it('CustomerType is a re-export of PersonType (same enum object)', () => {
    expect(CustomerType).toBe(PersonType);
  });

  it('exposes INDIVIDUAL and COMPANY values', () => {
    expect(PersonType.INDIVIDUAL).toBe('INDIVIDUAL');
    expect(PersonType.COMPANY).toBe('COMPANY');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- person-type.enum.spec.ts`
Expected: FAIL — `Cannot find module '@domain/enums/person-type.enum'`

- [ ] **Step 3: Create the enum and turn `CustomerType` into a re-export**

```ts
// app/src/domain/enums/person-type.enum.ts
export enum PersonType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}
```

```ts
// app/src/domain/enums/customer-type.enum.ts
export { PersonType as CustomerType } from './person-type.enum';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- person-type.enum.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full unit suite as a regression guard**

Run: `npm test`
Expected: PASS — every existing suite that imports `CustomerType` (customer entity, DTOs, mappers, responses) must be unaffected, since the enum object is identical.

- [ ] **Step 6: Commit**

```bash
git add app/src/domain/enums/person-type.enum.ts app/src/domain/enums/customer-type.enum.ts app/test/unit/domain/enums/person-type.enum.spec.ts
git commit -m "feat(domain): extract generic PersonType enum, CustomerType re-exports it"
```

---

### Task 2: Generalize `Document.create` — optional `type` with autodetection

**Files:**
- Modify: `app/src/domain/value-objects/document.vo.ts`
- Test: `app/test/unit/domain/value-objects/document.vo.spec.ts`

**Interfaces:**
- Consumes: `PersonType` from Task 1.
- Produces: `Document.create(value: string, type?: PersonType): Document` (type optional — autodetects CPF (11 digits) → `PersonType.INDIVIDUAL`, CNPJ (14 chars) → `PersonType.COMPANY`). `Document.sanitize(value: string): string` — now **public** (was private), reused by application-layer use cases in later tasks to avoid duplicating the mask-stripping regex.

- [ ] **Step 1: Write the failing tests**

Add to the end of `app/test/unit/domain/value-objects/document.vo.spec.ts` (keep existing `describe` blocks untouched):

```ts
import { PersonType } from '@domain/enums/person-type.enum';
// (add this import alongside the existing CustomerType import at the top of the file)

describe('create — autodetect (no type)', () => {
  it.each([
    ['123.456.789-09', '12345678909', PersonType.INDIVIDUAL],
    ['12345678909', '12345678909', PersonType.INDIVIDUAL],
    ['12.345.678/0001-95', '12345678000195', PersonType.COMPANY],
    ['12345678000195', '12345678000195', PersonType.COMPANY],
  ])('detects type for %p', (input, expectedValue, expectedType) => {
    const doc = Document.create(input);
    expect(doc.value).toBe(expectedValue);
    expect(doc.type).toBe(expectedType);
  });

  it('throws when sanitized value has neither CPF nor CNPJ length', () => {
    expect(() => Document.create('12345')).toThrow(DomainValidationException);
    expect(() => Document.create('12345')).toThrow('Documento inválido: informe um CPF ou CNPJ');
  });

  it('still throws on invalid checksum when autodetecting', () => {
    expect(() => Document.create('111.111.111-11')).toThrow(DomainValidationException);
    expect(() => Document.create('111.111.111-11')).toThrow('Pessoa física deve informar um CPF válido');
  });
});

describe('sanitize (public helper)', () => {
  it('strips formatting characters and uppercases', () => {
    expect(Document.sanitize('  12.345.678/0001-95  ')).toBe('12345678000195');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- document.vo.spec.ts`
Expected: FAIL — `Document.create('12345678909')` (1-arg call) fails TypeScript compilation (`type` currently required), and `Document.sanitize` is private.

- [ ] **Step 3: Implement the changes**

```ts
// app/src/domain/value-objects/document.vo.ts
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PersonType } from '../enums/person-type.enum';
import { DocumentValidator } from '../validators/document.validator';

export class Document {
  private constructor(
    public readonly value: string,
    public readonly type: PersonType,
  ) {}

  static create(value: string, type?: PersonType): Document {
    Document.validatePresence(value);

    const sanitized = Document.sanitize(value);
    const resolvedType = type ?? Document.detectType(sanitized);

    Document.validateMatchesType(sanitized, resolvedType);

    return new Document(sanitized, resolvedType);
  }

  static sanitize(value: string): string {
    return value
      .replaceAll(/[.\-/]/g, '')
      .trim()
      .toUpperCase();
  }

  private static detectType(sanitized: string): PersonType {
    if (sanitized.length === 11) return PersonType.INDIVIDUAL;
    if (sanitized.length === 14) return PersonType.COMPANY;

    throw new DomainValidationException('Documento inválido: informe um CPF ou CNPJ');
  }

  private static validatePresence(value: string | null | undefined): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Documento é obrigatório');
    }
  }

  private static validateMatchesType(value: string, type: PersonType): void {
    if (type === PersonType.INDIVIDUAL && !DocumentValidator.validateCpf(value)) {
      throw new DomainValidationException('Pessoa física deve informar um CPF válido');
    }

    if (type === PersonType.COMPANY && !DocumentValidator.validateCnpj(value)) {
      throw new DomainValidationException('Pessoa jurídica deve informar um CNPJ válido');
    }
  }

  equals(other: Document): boolean {
    return other instanceof Document && this.value === other.value && this.type === other.type;
  }

  toString(): string {
    return this.value;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- document.vo.spec.ts`
Expected: PASS — all existing tests (which always pass `type` explicitly) plus the new autodetect/sanitize tests.

- [ ] **Step 5: Run the full unit suite as a regression guard**

Run: `npm test`
Expected: PASS — no other file references `Document`'s private `sanitize`, so widening its visibility cannot break anything.

- [ ] **Step 6: Commit**

```bash
git add app/src/domain/value-objects/document.vo.ts app/test/unit/domain/value-objects/document.vo.spec.ts
git commit -m "feat(domain): make Document.create's type optional with autodetection"
```

---

### Task 3: `User` entity gains a `document` field

**Files:**
- Modify: `app/src/domain/entities/user.entity.ts`
- Test: `app/test/unit/domain/entities/user.entity.spec.ts`

**Interfaces:**
- Consumes: `Document.create(value: string)` from Task 2.
- Produces: `CreateUserProps.document: string`, `User.document: Document`, `user.changeDocument(document: string): void`, `UserPublicView.document: string`.

- [ ] **Step 1: Write the failing tests**

In `app/test/unit/domain/entities/user.entity.spec.ts`, add the import and update `validProps`:

```ts
import { Document } from '@domain/value-objects/document.vo';
// (alongside the existing Email import)

const validProps = {
  name: 'Rafael Neves',
  email: 'rafael@email.com',
  document: '12345678909',
  passwordHash: '$2b$12$hashedpassword',
  role: UserRole.ATTENDANT,
};
```

Add to the `create (factory method)` describe block:

```ts
it('should create user with a valid document', () => {
  const user = User.create(validProps);
  expect(user.document.value).toBe('12345678909');
});

it('should throw error if document is invalid', () => {
  expect(() => User.create({ ...validProps, document: '111.111.111-11' })).toThrow(
    DomainValidationException,
  );
  expect(() => User.create({ ...validProps, document: '111.111.111-11' })).toThrow(
    'Pessoa física deve informar um CPF válido',
  );
});
```

Add a new describe block after `changeEmail`:

```ts
describe('changeDocument', () => {
  it('should change document and sanitize it', () => {
    const user = User.create(validProps);
    user.changeDocument('12.345.678/0001-95');

    expect(user.document.value).toBe('12345678000195');
  });

  it('should throw error if new document is invalid', () => {
    const user = User.create(validProps);

    expect(() => user.changeDocument('12345')).toThrow(DomainValidationException);
  });
});
```

Update the `toPublicView` test's direct `User.reconstitute({...})` call and expectations:

```ts
describe('toPublicView', () => {
  it('should return public view without passwordHash', () => {
    const now = new Date();

    const user = User.reconstitute({
      id: 'uuid-123',
      name: 'Rafael',
      email: Email.create('rafael@email.com'),
      document: Document.create('12345678909'),
      passwordHash: 'secret-hash',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const view = user.toPublicView();

    expect(view).toEqual({
      id: 'uuid-123',
      name: 'Rafael',
      email: 'rafael@email.com',
      document: '12345678909',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    expect(view).not.toHaveProperty('passwordHash');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- user.entity.spec.ts`
Expected: FAIL — TypeScript compilation error, `document` is not a known property of `CreateUserProps`/`UserProps`, and `user.document`/`changeDocument` don't exist yet.

- [ ] **Step 3: Implement the entity changes**

```ts
// app/src/domain/entities/user.entity.ts
import { randomUUID } from 'node:crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { UserRole } from '../enums/user-role.enum';
import { Email } from '../value-objects/email.vo';
import { Document } from '../value-objects/document.vo';

import { PASSWORD_REGEX } from '../constants/regex/password.regex';
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '../constants/validation/user.constants';

const VALID_ROLES = Object.values(UserRole);

export interface CreateUserProps {
  name: string;
  email: string;
  document: string;
  passwordHash: string;
  role: UserRole;
}

interface UserProps {
  id: string;
  name: string;
  email: Email;
  document: Document;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: string;
  name: string;
  email: Email;
  document: Document;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.document = props.document;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: UserProps): User {
    return new User(props);
  }

  static create(props: CreateUserProps): User {
    User.validateName(props.name);
    User.validatePasswordHash(props.passwordHash);
    User.validateRole(props.role);

    const now = new Date();

    return new User({
      id: randomUUID(),
      name: props.name.trim(),
      email: Email.create(props.email),
      document: Document.create(props.document),
      passwordHash: props.passwordHash,
      role: props.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static validatePasswordStrength(password: string): void {
    if (!PASSWORD_REGEX.test(password)) {
      throw new DomainValidationException(PASSWORD_REQUIREMENTS_MESSAGE);
    }
  }

  changeName(name: string): void {
    User.validateName(name);
    this.name = name.trim();
    this.updatedAt = new Date();
  }

  changeEmail(email: string): void {
    this.email = Email.create(email);
    this.updatedAt = new Date();
  }

  changeDocument(document: string): void {
    this.document = Document.create(document);
    this.updatedAt = new Date();
  }

  changeRole(role: UserRole): void {
    User.validateRole(role);
    this.role = role;
    this.updatedAt = new Date();
  }

  changePassword(passwordHash: string): void {
    User.validatePasswordHash(passwordHash);
    this.passwordHash = passwordHash;
    this.updatedAt = new Date();
  }

  activate(): void {
    if (this.isActive) {
      throw new DomainValidationException('Usuário já está ativo');
    }
    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (!this.isActive) {
      throw new DomainValidationException('Usuário já está desativado');
    }
    this.isActive = false;
    this.updatedAt = new Date();
  }

  toPublicView(): UserPublicView {
    return {
      id: this.id,
      name: this.name,
      email: this.email.value,
      document: this.document.value,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length < MIN_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`);
    }

    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`);
    }
  }

  private static validatePasswordHash(passwordHash: string): void {
    if (!passwordHash || passwordHash.length === 0) {
      throw new DomainValidationException('Hash de senha não pode ser vazio');
    }
  }

  private static validateRole(role: UserRole): void {
    if (!VALID_ROLES.includes(role)) {
      throw new DomainValidationException(
        `Role inválida. Valores aceitos: ${VALID_ROLES.join(', ')}`,
      );
    }
  }
}

export interface UserPublicView {
  id: string;
  name: string;
  email: string;
  document: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- user.entity.spec.ts`
Expected: PASS (all existing + new document/changeDocument/toPublicView tests)

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/entities/user.entity.ts app/test/unit/domain/entities/user.entity.spec.ts
git commit -m "feat(domain): add document field to User entity"
```

**Note:** this commit will leave other files that construct `User.create`/`User.reconstitute` (use-case, mapper, both mock factories, the Prisma repository spec) failing to compile — that is expected and fixed by Tasks 4, 5, and 9. Do not run the full suite/build after this task; run it after Task 4.

---

### Task 4: `IUserRepository.findByDocument` + shared test helpers

**Files:**
- Modify: `app/src/domain/interfaces/repositories/user.repository.interface.ts`
- Create: `app/test/helpers/document.helper.ts`
- Test: `app/test/helpers/document.helper.spec.ts`
- Modify: `app/test/helpers/mock-factories.ts`
- Modify: `app/test/helpers/user-mock.factory.ts`

**Interfaces:**
- Produces: `IUserRepository.findByDocument(document: string): Promise<User | null>`; `generateValidCpf(seed: number): string` (test helper — deterministic, always passes `DocumentValidator.validateCpf`, different seeds produce different CPFs — used later by the E2E auth helper and seed data for real-database uniqueness).
- `createMockUser` now defaults `document` to a valid CPF (`'12345678909'`) unless overridden. `createMockUserRepository` now mocks `findByDocument` too.

- [ ] **Step 1: Write the failing test for the CPF generator**

```ts
// app/test/helpers/document.helper.spec.ts
import { DocumentValidator } from '@domain/validators/document.validator';
import { generateValidCpf } from './document.helper';

describe('generateValidCpf', () => {
  it('generates a valid, 11-digit CPF for arbitrary seeds', () => {
    for (const seed of [1, 42, 999_999_999, 123_456_789, Date.now()]) {
      const cpf = generateValidCpf(seed);
      expect(cpf).toHaveLength(11);
      expect(DocumentValidator.validateCpf(cpf)).toBe(true);
    }
  });

  it('generates different CPFs for different seeds', () => {
    expect(generateValidCpf(1)).not.toBe(generateValidCpf(2));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- document.helper.spec.ts`
Expected: FAIL — `Cannot find module './document.helper'`

- [ ] **Step 3: Implement the generator and the repository interface**

```ts
// app/test/helpers/document.helper.ts
function checkDigit(digits: number[], startWeight: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (startWeight - index), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Deterministically derives a checksum-valid CPF from a numeric seed (e.g. Date.now()). */
export function generateValidCpf(seed: number): string {
  let base = (Math.abs(Math.trunc(seed)) % 900_000_000) + 100_000_000;
  let digitsStr = base.toString().padStart(9, '0');

  if (/^(\d)\1{8}$/.test(digitsStr)) {
    base += 1;
    digitsStr = base.toString().padStart(9, '0');
  }

  const digits = digitsStr.split('').map(Number);
  const d1 = checkDigit(digits, 10);
  const d2 = checkDigit([...digits, d1], 11);

  return [...digits, d1, d2].join('');
}
```

```ts
// app/src/domain/interfaces/repositories/user.repository.interface.ts
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';

export interface UserFilters {
  role?: UserRole;
  name?: string;
}

export interface IUserRepository {
  create(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByDocument(document: string): Promise<User | null>;
  findAllPaginated(
    pagination: PaginationInput,
    filters?: UserFilters,
  ): Promise<PaginatedRepositoryResult<User>>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- document.helper.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Update both mock factories**

```ts
// app/test/helpers/mock-factories.ts
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ITokenService, TokenPair } from '@application/ports/output/token.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';

export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date();

  return User.reconstitute({
    id: 'user-uuid-123',
    name: 'Rafael Neves',
    email: Email.create('rafael@email.com'),
    document: Document.create('12345678909'),
    passwordHash: '$2b$12$hashedpassword',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function createMockUserRepository(): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByDocument: jest.fn(),
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

export function createMockHashService(): jest.Mocked<IHashService> {
  return {
    hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
    compare: jest.fn().mockResolvedValue(true),
  };
}

export function createMockTokenService(): jest.Mocked<ITokenService> {
  const pair: TokenPair = {
    accessToken: 'access-token-mock',
    refreshToken: 'refresh-token-mock',
  };

  return {
    signAccessToken: jest.fn().mockReturnValue('access-token-mock'),
    signRefreshToken: jest.fn().mockReturnValue('refresh-token-mock'),
    signTokenPair: jest.fn().mockReturnValue(pair),
    verifyRefreshToken: jest
      .fn()
      .mockReturnValue({ sub: 'user-uuid-123', email: 'rafael@email.com', role: UserRole.ADMIN }),
    signWithSecret: jest.fn().mockReturnValue('signed-token'),
    verifyWithSecret: jest.fn().mockReturnValue({ any: 'payload' }),
  };
}
```

```ts
// app/test/helpers/user-mock.factory.ts
import { randomUUID } from 'node:crypto';
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';

export function createMockPrismaUser(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: randomUUID(),
    name: 'John Doe',
    email: 'john.doe@example.com',
    document: '12345678909',
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.ATTENDANT,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date();

  return User.reconstitute({
    id: randomUUID(),
    name: 'John Doe',
    email: Email.create('john.doe@example.com'),
    document: Document.create('12345678909'),
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.ATTENDANT,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

export function createMockUserRepository(): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByDocument: jest.fn(),
    findAllPaginated: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}
```

- [ ] **Step 6: Run the full unit suite**

Run: `npm test`
Expected: still FAIL for `create-user.use-case.ts`, `user.mapper.ts` and `prisma-user.repository.spec.ts` (they don't pass `document` yet — fixed in Tasks 5 and 9). Every other suite (which goes through `createMockUser`/`createMockPrismaUser`) should now compile and pass, since the factories supply a default document.

- [ ] **Step 7: Commit**

```bash
git add app/src/domain/interfaces/repositories/user.repository.interface.ts app/test/helpers/document.helper.ts app/test/helpers/document.helper.spec.ts app/test/helpers/mock-factories.ts app/test/helpers/user-mock.factory.ts
git commit -m "test: add findByDocument to IUserRepository and CPF generator helper"
```

---

### Task 5: `CreateUserUseCase` requires and validates document

**Files:**
- Modify: `app/src/application/ports/input/user/dto/create-user.dto.ts`
- Modify: `app/src/application/use-cases/user/create-user.use-case.ts`
- Test: `app/test/unit/application/use-cases/user/create-user.use-case.spec.ts`

**Interfaces:**
- Consumes: `Document.sanitize` (Task 2), `IUserRepository.findByDocument` (Task 4).
- Produces: `CreateUserDto.document: string`.

- [ ] **Step 1: Write the failing tests**

Update the 3 existing tests in `create-user.use-case.spec.ts` to the exact code below (each adds `document: '...'` to the `.execute({...})` payload, and `userRepository.findByDocument.mockResolvedValue(null)` next to the existing `findByEmail` mock), then add a 4th test:

```ts
// app/test/unit/application/use-cases/user/create-user.use-case.spec.ts
it('should create user successfully', async () => {
  userRepository.findByEmail.mockResolvedValue(null);
  userRepository.findByDocument.mockResolvedValue(null);
  userRepository.create.mockImplementation((user) =>
    Promise.resolve(
      createMockUser({
        name: user.name,
        email: user.email,
        document: user.document,
        role: user.role,
        isActive: user.isActive,
      }),
    ),
  );

  const result = await useCase.execute({
    name: 'Lucas Almeida',
    email: 'lucas@email.com',
    document: '12345678909',
    password: 'Senha@123',
    role: UserRole.MECHANIC,
  });

  expect(result.name).toBe('Lucas Almeida');
  expect(result.role).toBe(UserRole.MECHANIC);
  expect(hashService.hash).toHaveBeenCalledWith('Senha@123');
});

it('should throw DomainValidationException if password is weak', async () => {
  await expect(
    useCase.execute({
      name: 'Lucas Almeida',
      email: 'lucas@email.com',
      document: '12345678909',
      password: '123456',
      role: UserRole.MECHANIC,
    }),
  ).rejects.toThrow(DomainValidationException);

  expect(userRepository.findByEmail).not.toHaveBeenCalled();
  expect(hashService.hash).not.toHaveBeenCalled();
  expect(userRepository.create).not.toHaveBeenCalled();
});

it('should throw ResourceConflictException if email already exists', async () => {
  userRepository.findByEmail.mockResolvedValue(createMockUser());

  await expect(
    useCase.execute({
      name: 'Duplicado',
      email: 'rafael@email.com',
      document: '12345678909',
      password: 'Senha@123',
      role: UserRole.ATTENDANT,
    }),
  ).rejects.toThrow(ResourceConflictException);

  expect(userRepository.create).not.toHaveBeenCalled();
});

it('should throw ResourceConflictException if document already exists', async () => {
  userRepository.findByEmail.mockResolvedValue(null);
  userRepository.findByDocument.mockResolvedValue(createMockUser());

  await expect(
    useCase.execute({
      name: 'Duplicado',
      email: 'novo@email.com',
      document: '12345678909',
      password: 'Senha@123',
      role: UserRole.ATTENDANT,
    }),
  ).rejects.toThrow(ResourceConflictException);

  expect(userRepository.create).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- create-user.use-case.spec.ts`
Expected: FAIL — TS error (`document` missing from `CreateUserDto`) and the new conflict test fails (no such check exists).

- [ ] **Step 3: Implement**

```ts
// app/src/application/ports/input/user/dto/create-user.dto.ts
import { UserPublicView } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';

export interface CreateUserDto {
  name: string;
  email: string;
  document: string;
  password: string;
  role: UserRole;
}

export type CreateUserOutputDto = UserPublicView;
```

```ts
// app/src/application/use-cases/user/create-user.use-case.ts
import { User } from '@domain/entities/user.entity';
import { Document } from '@domain/value-objects/document.vo';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

import {
  CreateUserDto,
  CreateUserOutputDto,
} from '@application/ports/input/user/dto/create-user.dto';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(createUserDto: CreateUserDto): Promise<CreateUserOutputDto> {
    User.validatePasswordStrength(createUserDto.password);

    const existingEmail = await this.userRepository.findByEmail(
      createUserDto.email.trim().toLowerCase(),
    );

    if (existingEmail) {
      throw new ResourceConflictException('E-mail já cadastrado no sistema');
    }

    const existingDocument = await this.userRepository.findByDocument(
      Document.sanitize(createUserDto.document),
    );

    if (existingDocument) {
      throw new ResourceConflictException('Documento já cadastrado no sistema');
    }

    const passwordHash = await this.hashService.hash(createUserDto.password);

    const user = User.create({
      name: createUserDto.name,
      email: createUserDto.email,
      document: createUserDto.document,
      passwordHash,
      role: createUserDto.role,
    });

    const created = await this.userRepository.create(user);

    return created.toPublicView();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- create-user.use-case.spec.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/src/application/ports/input/user/dto/create-user.dto.ts app/src/application/use-cases/user/create-user.use-case.ts app/test/unit/application/use-cases/user/create-user.use-case.spec.ts
git commit -m "feat(user): require and validate document on user creation"
```

---

### Task 6: `UpdateUserUseCase` supports updating the document

**Files:**
- Modify: `app/src/application/ports/input/user/dto/update-user.dto.ts`
- Modify: `app/src/application/use-cases/user/update-user.use-case.ts`
- Test: `app/test/unit/application/use-cases/user/update-user.use-case.spec.ts`

**Interfaces:**
- Consumes: `Document.create`/`.equals` (Task 2/3), `IUserRepository.findByDocument` (Task 4).
- Produces: `UpdateUserDto.document?: string`.

- [ ] **Step 1: Write the failing tests**

Add to `update-user.use-case.spec.ts`, mirroring the existing email tests:

```ts
import { Document } from '@domain/value-objects/document.vo';
// (alongside the existing Email import)

it('should update document checking uniqueness', async () => {
  const user = createMockUser({ document: Document.create('12345678909') });
  userRepository.findById.mockResolvedValue(user);
  userRepository.findByDocument.mockResolvedValue(null);
  userRepository.update.mockImplementation((data) =>
    Promise.resolve(createMockUser({ document: data.document })),
  );

  const result = await useCase.execute('user-uuid-123', { document: '12345678000195' });

  expect(result.document).toBe('12345678000195');
  expect(userRepository.findByDocument).toHaveBeenCalledWith('12345678000195');
});

it('should allow keeping the same document', async () => {
  const user = createMockUser({ document: Document.create('12345678909') });
  userRepository.findById.mockResolvedValue(user);
  userRepository.update.mockImplementation(() => Promise.resolve(user));

  await useCase.execute('user-uuid-123', { document: '123.456.789-09' });

  expect(userRepository.findByDocument).not.toHaveBeenCalled();
});

it('should throw ResourceConflictException if new document already exists', async () => {
  const user = createMockUser({ document: Document.create('12345678909') });
  userRepository.findById.mockResolvedValue(user);
  userRepository.findByDocument.mockResolvedValue(createMockUser({ id: 'outro-id' }));

  await expect(
    useCase.execute('user-uuid-123', { document: '12345678000195' }),
  ).rejects.toThrow(ResourceConflictException);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- update-user.use-case.spec.ts`
Expected: FAIL — TS error (`document` missing from `UpdateUserDto`), new tests fail (no such branch exists in the use case).

- [ ] **Step 3: Implement**

```ts
// app/src/application/ports/input/user/dto/update-user.dto.ts
import { UserPublicView } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';

export interface UpdateUserDto {
  name?: string;
  email?: string;
  document?: string;
  password?: string;
  role?: UserRole;
}

export type UpdateUserOutputDto = UserPublicView;
```

```ts
// app/src/application/use-cases/user/update-user.use-case.ts
import { User } from '@domain/entities/user.entity';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

import {
  UpdateUserDto,
  UpdateUserOutputDto,
} from '@application/ports/input/user/dto/update-user.dto';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

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

    if (updateUserDto.password !== undefined) {
      User.validatePasswordStrength(updateUserDto.password);

      const passwordHash = await this.hashService.hash(updateUserDto.password);

      user.changePassword(passwordHash);
    }

    const updated = await this.userRepository.update(user);

    return updated.toPublicView();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- update-user.use-case.spec.ts`
Expected: PASS (all existing + 3 new tests)

- [ ] **Step 5: Commit**

```bash
git add app/src/application/ports/input/user/dto/update-user.dto.ts app/src/application/use-cases/user/update-user.use-case.ts app/test/unit/application/use-cases/user/update-user.use-case.spec.ts
git commit -m "feat(user): support updating document with uniqueness check"
```

---

### Task 7: Login by e-mail or document (`identifier`)

**Files:**
- Modify: `app/src/application/ports/input/auth/dto/authenticate-user.dto.ts`
- Modify: `app/src/application/use-cases/auth/authenticate-user.use-case.ts`
- Test: `app/test/unit/application/use-cases/auth/authenticate-user.use-case.spec.ts`

**Interfaces:**
- Consumes: `Document.sanitize` (Task 2), `IUserRepository.findByDocument` (Task 4).
- Produces: `AuthenticateUserInputDto.identifier: string` (replaces `email`).

- [ ] **Step 1: Write the failing tests**

Update the 5 existing tests in `authenticate-user.use-case.spec.ts` to the exact code below (each replaces its `email:` key with `identifier:`), then add 2 new tests:

```ts
// app/test/unit/application/use-cases/auth/authenticate-user.use-case.spec.ts
it('should authenticate user successfully and return tokens', async () => {
  const user = createMockUser();
  userRepository.findByEmail.mockResolvedValue(user);
  hashService.compare.mockResolvedValue(true);

  const result = await useCase.execute({
    identifier: 'rafael@email.com',
    password: 'Senha@123',
  });

  expect(result.accessToken).toBe('access-token-mock');
  expect(result.refreshToken).toBe('refresh-token-mock');
  expect(result.user.id).toBe(user.id);
  expect(result.user.email).toBe(user.email.value);
  expect(tokenService.signTokenPair).toHaveBeenCalledWith({
    sub: user.id,
    email: user.email.value,
    role: user.role,
  });
});

it('should throw UnauthorizedAccessException if user does not exist', async () => {
  userRepository.findByEmail.mockResolvedValue(null);

  await expect(
    useCase.execute({ identifier: 'naoexiste@email.com', password: '123456' }),
  ).rejects.toThrow(UnauthorizedAccessException);
});

it('should throw UnauthorizedAccessException if user is deactivated', async () => {
  const user = createMockUser({ isActive: false });
  userRepository.findByEmail.mockResolvedValue(user);

  await expect(
    useCase.execute({ identifier: 'rafael@email.com', password: 'Senha@123' }),
  ).rejects.toThrow('Credenciais inválidas');
});

it('should throw UnauthorizedAccessException if password is incorrect', async () => {
  const user = createMockUser();
  userRepository.findByEmail.mockResolvedValue(user);
  hashService.compare.mockResolvedValue(false);

  await expect(
    useCase.execute({ identifier: 'rafael@email.com', password: 'errada' }),
  ).rejects.toThrow('Credenciais inválidas');
});

it('não deve gerar tokens se autenticação falhar', async () => {
  userRepository.findByEmail.mockResolvedValue(null);

  await expect(
    useCase.execute({ identifier: 'rafael@email.com', password: '123456' }),
  ).rejects.toThrow();

  expect(tokenService.signTokenPair).not.toHaveBeenCalled();
});

it('should authenticate by document when identifier has no @', async () => {
  const user = createMockUser();
  userRepository.findByDocument.mockResolvedValue(user);
  hashService.compare.mockResolvedValue(true);

  const result = await useCase.execute({
    identifier: '12345678909',
    password: 'Senha@123',
  });

  expect(result.accessToken).toBe('access-token-mock');
  expect(userRepository.findByDocument).toHaveBeenCalledWith('12345678909');
  expect(userRepository.findByEmail).not.toHaveBeenCalled();
});

it('should sanitize a masked document identifier before lookup', async () => {
  userRepository.findByDocument.mockResolvedValue(null);

  await expect(
    useCase.execute({ identifier: '123.456.789-09', password: 'Senha@123' }),
  ).rejects.toThrow('Credenciais inválidas');

  expect(userRepository.findByDocument).toHaveBeenCalledWith('12345678909');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- authenticate-user.use-case.spec.ts`
Expected: FAIL — TS error (`identifier` unknown on `{email: ...}` literals is fine since it's a plain object, but `AuthenticateUserInputDto` still requires `email`, so `.execute({identifier: ...})` fails compilation), and `findByDocument` assertions fail (use case doesn't call it yet).

- [ ] **Step 3: Implement**

```ts
// app/src/application/ports/input/auth/dto/authenticate-user.dto.ts
import { UserRole } from '@domain/enums/user-role.enum';

export interface AuthenticateUserInputDto {
  identifier: string;
  password: string;
}

export interface AuthenticateUserOutputDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}
```

```ts
// app/src/application/use-cases/auth/authenticate-user.use-case.ts
import { User } from '@domain/entities/user.entity';
import { Document } from '@domain/value-objects/document.vo';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { ITokenService } from '@application/ports/output/token.service.interface';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import {
  AuthenticateUserInputDto,
  AuthenticateUserOutputDto,
} from '@application/ports/input/auth/dto/authenticate-user.dto';

import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: AuthenticateUserInputDto): Promise<AuthenticateUserOutputDto> {
    const user = await this.findUserByIdentifier(input.identifier);

    if (!user?.isActive) {
      throw new UnauthorizedAccessException('Credenciais inválidas');
    }

    const passwordMatches = await this.hashService.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedAccessException('Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email.value, role: user.role };
    const { accessToken, refreshToken } = this.tokenService.signTokenPair(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email.value,
        role: user.role,
      },
    };
  }

  private async findUserByIdentifier(identifier: string): Promise<User | null> {
    if (identifier.includes('@')) {
      return this.userRepository.findByEmail(identifier);
    }

    return this.userRepository.findByDocument(Document.sanitize(identifier));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- authenticate-user.use-case.spec.ts`
Expected: PASS (all existing + 2 new tests)

- [ ] **Step 5: Commit**

```bash
git add app/src/application/ports/input/auth/dto/authenticate-user.dto.ts app/src/application/use-cases/auth/authenticate-user.use-case.ts app/test/unit/application/use-cases/auth/authenticate-user.use-case.spec.ts
git commit -m "feat(auth): allow login by e-mail or CPF/CNPJ"
```

---

### Task 8: Expose `document` on the current-user endpoint

**Files:**
- Modify: `app/src/application/ports/input/auth/dto/get-current-user.dto.ts`
- Modify: `app/src/application/use-cases/auth/get-current-user.use-case.ts`
- Test: `app/test/unit/application/use-cases/auth/get-current-user.use-case.spec.ts` (if it doesn't already assert the full shape, add the assertion below)

**Interfaces:**
- Produces: `GetCurrentUserOutputDto.document: string`.

- [ ] **Step 1: Write/extend the failing test**

Find the existing "should return current user data" (or equivalent) test in `get-current-user.use-case.spec.ts` and extend its assertion to include `document`:

```ts
expect(result).toEqual({
  id: user.id,
  name: user.name,
  email: user.email.value,
  document: user.document.value,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- get-current-user.use-case.spec.ts`
Expected: FAIL — actual result object has no `document` key yet.

- [ ] **Step 3: Implement**

```ts
// app/src/application/ports/input/auth/dto/get-current-user.dto.ts
import { UserRole } from '@domain/enums/user-role.enum';

export interface GetCurrentUserOutputDto {
  id: string;
  name: string;
  email: string;
  document: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

```ts
// app/src/application/use-cases/auth/get-current-user.use-case.ts
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<GetCurrentUserOutputDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', userId);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      document: user.document.value,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- get-current-user.use-case.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/application/ports/input/auth/dto/get-current-user.dto.ts app/src/application/use-cases/auth/get-current-user.use-case.ts app/test/unit/application/use-cases/auth/get-current-user.use-case.spec.ts
git commit -m "feat(auth): include document in GET /auth/me response"
```

---

### Task 9: Database — schema, migration, mapper, Prisma repository

**Files:**
- Modify: `app/prisma/schema.prisma`
- Create: a new migration under `app/prisma/migrations/` (generated by the command below, not hand-written)
- Modify: `app/src/infrastructure/persistence/prisma/mappers/user.mapper.ts`
- Modify: `app/src/infrastructure/persistence/prisma/repositories/prisma-user.repository.ts`
- Test: `app/test/unit/infrastructure/persistence/prisma/repositories/prisma-user.repository.spec.ts`

**Interfaces:**
- Consumes: `Document.create`, `IUserRepository.findByDocument` (Tasks 2–4).
- Produces: `PrismaUserRepository.findByDocument(document: string): Promise<User | null>`.

- [ ] **Step 1: Update the Prisma schema**

```prisma
// app/prisma/schema.prisma — User model
model User {
  id           String   @id @default(uuid()) @db.Uuid
  name         String   @db.VarChar(150)
  email        String   @unique @db.VarChar(150)
  document     String   @unique @db.VarChar(18)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  role         UserRole @default(ATTENDANT)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at")

  assignedWorkOrders WorkOrder[]     @relation("AssignedUser")
  statusChanges      StatusHistory[]

  @@map("users")
}
```

- [ ] **Step 2: Generate and apply the migration against your local dev database**

Run: `npx prisma migrate dev --name add_document_to_user`

If this fails with a `NOT NULL constraint` violation (because your local `users` table already has rows without a document, e.g. from a previous seed run), reset the local database first — this is safe because the project is not in production and `db:reset` re-seeds afterward (Task 10 will make the seed insert valid documents):

```bash
npm run db:reset
npx prisma migrate dev --name add_document_to_user
```

Expected: a new folder appears under `app/prisma/migrations/` with the `ALTER TABLE "users" ADD COLUMN "document" ...` SQL, and `prisma generate` runs automatically, regenerating the Prisma Client types (`User` now has `document: string`).

- [ ] **Step 3: Write the failing unit tests for the mapper and repository**

Add `import { Document } from '@domain/value-objects/document.vo';` to the top of the file, alongside the existing `Email` import. Then update each of these 8 existing tests to the exact code shown below — every change is the same shape: a `document: '...'` string added to a `User.create({...})` input, and a `document: Document.create(prismaModel.document)` added to any `User.reconstitute({...})` expectation, plus `document` threaded through the matching `createMockPrismaUser({...})` call and `toHaveBeenCalledWith` data block.

**`describe('create', ...)` → `'should create a user and return domain entity'`:**

```ts
it('should create a user and return domain entity', async () => {
  const user = User.create({
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    document: '12345678909',
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.MECHANIC,
  });

  const prismaModel = createMockPrismaUser({
    name: user.name,
    email: user.email.value,
    document: user.document.value,
    passwordHash: user.passwordHash,
    role: user.role,
    isActive: user.isActive,
  });

  prisma.user.create.mockResolvedValue(prismaModel);

  const result = await repository.create(user);

  expect(result).toEqual(
    User.reconstitute({
      id: prismaModel.id,
      name: prismaModel.name,
      email: Email.create(prismaModel.email),
      document: Document.create(prismaModel.document),
      passwordHash: prismaModel.passwordHash,
      role: prismaModel.role,
      isActive: prismaModel.isActive,
      createdAt: prismaModel.createdAt,
      updatedAt: prismaModel.updatedAt,
    }),
  );

  expect(prisma.user.create).toHaveBeenCalledWith({
    data: {
      name: user.name,
      email: user.email.value,
      document: user.document.value,
      passwordHash: user.passwordHash,
      role: user.role,
      isActive: user.isActive,
    },
  });
});
```

**`describe('create', ...)` → `'should throw ResourceConflictException on P2002'`:**

```ts
it('should throw ResourceConflictException on P2002', async () => {
  const user = User.create({
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    document: '12345678909',
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.MECHANIC,
  });

  const error = new Prisma.PrismaClientKnownRequestError('Duplicate email', {
    code: 'P2002',
    clientVersion: '5.0.0',
  });
  prisma.user.create.mockRejectedValue(error);

  await expect(repository.create(user)).rejects.toThrow(ResourceConflictException);
});
```

**`describe('create', ...)` → `'should rethrow unexpected errors'`:**

```ts
it('should rethrow unexpected errors', async () => {
  const user = User.create({
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    document: '12345678909',
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.MECHANIC,
  });

  const error = new Error('Database connection lost');
  prisma.user.create.mockRejectedValue(error);

  await expect(repository.create(user)).rejects.toThrow('Database connection lost');
});
```

**`describe('findById', ...)` → `'should find a user by id and return domain entity'`** (`createMockPrismaUser` already defaults `document` since Task 4 — no change needed to the `{ id }` override — only the expectation gains `document`):

```ts
it('should find a user by id and return domain entity', async () => {
  const id = randomUUID();
  const prismaModel = createMockPrismaUser({ id });

  prisma.user.findUnique.mockResolvedValue(prismaModel);

  const result = await repository.findById(id);

  expect(result).toEqual(
    User.reconstitute({
      id: prismaModel.id,
      name: prismaModel.name,
      email: Email.create(prismaModel.email),
      document: Document.create(prismaModel.document),
      passwordHash: prismaModel.passwordHash,
      role: prismaModel.role,
      isActive: prismaModel.isActive,
      createdAt: prismaModel.createdAt,
      updatedAt: prismaModel.updatedAt,
    }),
  );

  expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id } });
});
```

**`describe('findByEmail', ...)` → `'should find a user by email and return domain entity'`:**

```ts
it('should find a user by email and return domain entity', async () => {
  const email = 'john.doe@example.com';
  const prismaModel = createMockPrismaUser({ email });

  prisma.user.findUnique.mockResolvedValue(prismaModel);

  const result = await repository.findByEmail(email);

  expect(result).toEqual(
    User.reconstitute({
      id: prismaModel.id,
      name: prismaModel.name,
      email: Email.create(prismaModel.email),
      document: Document.create(prismaModel.document),
      passwordHash: prismaModel.passwordHash,
      role: prismaModel.role,
      isActive: prismaModel.isActive,
      createdAt: prismaModel.createdAt,
      updatedAt: prismaModel.updatedAt,
    }),
  );

  expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email } });
});
```

**`describe('update', ...)` → `'should update a user and return domain entity'`:**

```ts
it('should update a user and return domain entity', async () => {
  const user = User.reconstitute({
    id: randomUUID(),
    name: 'Updated Name',
    email: Email.create('updated@example.com'),
    document: Document.create('12345678909'),
    passwordHash: '$2b$10$newhash',
    role: UserRole.ADMIN,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const updatedPrismaModel = createMockPrismaUser({
    id: user.id,
    name: user.name,
    email: user.email.value,
    document: user.document.value,
    passwordHash: user.passwordHash,
    role: user.role,
    isActive: user.isActive,
  });

  prisma.user.update.mockResolvedValue(updatedPrismaModel);

  const result = await repository.update(user);

  expect(result.name).toBe(user.name);
  expect(result.role).toBe(user.role);
  expect(prisma.user.update).toHaveBeenCalledWith({
    where: { id: user.id },
    data: {
      name: user.name,
      email: user.email.value,
      document: user.document.value,
      passwordHash: user.passwordHash,
      role: user.role,
      isActive: user.isActive,
    },
  });
});
```

**`describe('update', ...)` → `'should throw ResourceConflictException on P2002'`:**

```ts
it('should throw ResourceConflictException on P2002', async () => {
  const user = User.reconstitute({
    id: randomUUID(),
    name: 'Test',
    email: Email.create('dup@example.com'),
    document: Document.create('12345678909'),
    passwordHash: '$2b$10$hash',
    role: UserRole.MECHANIC,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const error = new Prisma.PrismaClientKnownRequestError('Duplicate email', {
    code: 'P2002',
    clientVersion: '5.0.0',
  });
  prisma.user.update.mockRejectedValue(error);

  await expect(repository.update(user)).rejects.toThrow(ResourceConflictException);
});
```

**`describe('update', ...)` → `'should rethrow unexpected errors from update'`:**

```ts
it('should rethrow unexpected errors from update', async () => {
  const user = User.reconstitute({
    id: randomUUID(),
    name: 'Test',
    email: Email.create('test@example.com'),
    document: Document.create('12345678909'),
    passwordHash: '$2b$10$hash',
    role: UserRole.MECHANIC,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const unexpectedError = new Error('Database connection lost');
  prisma.user.update.mockRejectedValue(unexpectedError);

  await expect(repository.update(user)).rejects.toThrow('Database connection lost');
});
```

`describe('delete', ...)` needs no change — it only calls `createMockPrismaUser({ id })`, which already defaults `document` since Task 4.

Then add a new describe block:

```ts
describe('findByDocument', () => {
  it('should find a user by document and return domain entity', async () => {
    const document = '12345678909';
    const prismaModel = createMockPrismaUser({ document });

    prisma.user.findUnique.mockResolvedValue(prismaModel);

    const result = await repository.findByDocument(document);

    expect(result).toEqual(
      User.reconstitute({
        id: prismaModel.id,
        name: prismaModel.name,
        email: Email.create(prismaModel.email),
        document: Document.create(prismaModel.document),
        passwordHash: prismaModel.passwordHash,
        role: prismaModel.role,
        isActive: prismaModel.isActive,
        createdAt: prismaModel.createdAt,
        updatedAt: prismaModel.updatedAt,
      }),
    );

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { document } });
  });

  it('should return null when user is not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await repository.findByDocument('00000000000');

    expect(result).toBeNull();
  });
});
```

Also update the two `create`/`update` "should throw ResourceConflictException on P2002" tests to assert the message picks the right field (see Step 4 below) — add:

```ts
it('should mention document in the conflict message when document is the P2002 target', async () => {
  const user = User.create({
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    document: '12345678909',
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.MECHANIC,
  });

  const error = new Prisma.PrismaClientKnownRequestError('Duplicate document', {
    code: 'P2002',
    clientVersion: '5.0.0',
    meta: { target: ['document'] },
  });
  prisma.user.create.mockRejectedValue(error);

  await expect(repository.create(user)).rejects.toThrow('Documento já cadastrado');
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- prisma-user.repository.spec.ts`
Expected: FAIL — compilation errors (missing `document`) and `findByDocument`/conflict-message tests fail (method/behavior don't exist).

- [ ] **Step 5: Implement the mapper and repository**

```ts
// app/src/infrastructure/persistence/prisma/mappers/user.mapper.ts
import { User as PrismaUser } from '@generated/client';
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';

export class UserMapper {
  static toDomain(record: PrismaUser): User {
    return User.reconstitute({
      id: record.id,
      name: record.name,
      email: Email.create(record.email),
      document: Document.create(record.document),
      passwordHash: record.passwordHash,
      role: record.role as UserRole,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
```

```ts
// app/src/infrastructure/persistence/prisma/repositories/prisma-user.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, User as PrismaUser } from '@generated/client';

import { PrismaService } from '../prisma.service';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

import { User } from '@domain/entities/user.entity';
import {
  IUserRepository,
  UserFilters,
} from '@domain/interfaces/repositories/user.repository.interface';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';

import { UserMapper } from '../mappers/user.mapper';
import { paginate } from '../helpers/prisma-paginate.helper';

function conflictMessage(error: Prisma.PrismaClientKnownRequestError): string {
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target : [];

  if (fields.includes('document')) return 'Documento já cadastrado';
  return 'E-mail já cadastrado';
}

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: User): Promise<User> {
    try {
      const created = await this.prisma.user.create({
        data: {
          name: user.name,
          email: user.email.value,
          document: user.document.value,
          passwordHash: user.passwordHash,
          role: user.role,
          isActive: user.isActive,
        },
      });

      return UserMapper.toDomain(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException(conflictMessage(error));
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });

    if (!record) return null;

    return UserMapper.toDomain(record);
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });

    if (!record) return null;

    return UserMapper.toDomain(record);
  }

  async findByDocument(document: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { document } });

    if (!record) return null;

    return UserMapper.toDomain(record);
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters?: UserFilters,
  ): Promise<PaginatedRepositoryResult<User>> {
    const where: Prisma.UserWhereInput = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.name) {
      where.name = { contains: filters.name.trim(), mode: 'insensitive' };
    }

    const result = await paginate(
      this.prisma.user,
      {
        where,
        orderBy: { createdAt: 'desc' },
      },
      pagination,
    );

    return {
      items: result.items.map((record: PrismaUser) => UserMapper.toDomain(record)),
      total: result.total,
    };
  }

  async update(user: User): Promise<User> {
    try {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name,
          email: user.email.value,
          document: user.document.value,
          passwordHash: user.passwordHash,
          role: user.role,
          isActive: user.isActive,
        },
      });

      return UserMapper.toDomain(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException(`${conflictMessage(error)} para outro usuário`);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
```

**Note:** the two pre-existing P2002 tests ("should throw ResourceConflictException on P2002" for `create` and `update`) build their mock error without `meta.target`, so `conflictMessage` falls through to the `'E-mail já cadastrado'` default — identical to today's behavior. Only the new test (Step 3) supplies `meta: { target: ['document'] }`, exercising the new branch.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- prisma-user.repository.spec.ts`
Expected: PASS (all existing + new `findByDocument` + conflict-message tests)

- [ ] **Step 7: Run the full unit suite**

Run: `npm test`
Expected: PASS — every suite touching `User`/`UserMapper`/`PrismaUserRepository` now compiles and passes.

- [ ] **Step 8: Commit**

```bash
git add app/prisma/schema.prisma app/prisma/migrations app/src/infrastructure/persistence/prisma/mappers/user.mapper.ts app/src/infrastructure/persistence/prisma/repositories/prisma-user.repository.ts app/test/unit/infrastructure/persistence/prisma/repositories/prisma-user.repository.spec.ts
git commit -m "feat(db): add document column to users, wire up findByDocument"
```

---

### Task 10: HTTP layer — DTOs, responses, presenters

**Files:**
- Modify: `app/src/interface-adapters/user/requests/create-user-request.ts`
- Modify: `app/src/interface-adapters/user/requests/update-user-request.ts`
- Modify: `app/src/interface-adapters/user/responses/user.response.ts`
- Modify: `app/src/interface-adapters/user/user.presenter.ts`
- Modify: `app/src/interface-adapters/auth/requests/login-request.ts`
- Modify: `app/src/interface-adapters/auth/responses/auth.response.ts`
- Modify: `app/src/infrastructure/http/controllers/user/dto/requests/create-user-request.dto.ts`
- Modify: `app/src/infrastructure/http/controllers/user/dto/requests/update-user-request.dto.ts`
- Modify: `app/src/infrastructure/http/controllers/user/dto/responses/user-response.dto.ts`
- Modify: `app/src/infrastructure/http/controllers/auth/dto/requests/login-request.dto.ts`
- Modify: `app/src/infrastructure/http/controllers/auth/dto/responses/me-response.dto.ts`

**Interfaces:**
- Consumes: `IsValidCpfCnpj` decorator (already exists, `@infrastructure/http/validators/document.validator`), `UserPublicView.document` (Task 3), `AuthenticateUserInputDto.identifier` (Task 7), `GetCurrentUserOutputDto.document` (Task 8).
- Produces: `CreateUserRequest.document`, `UpdateUserRequest.document?`, `UserResponse.document`, `LoginRequest.identifier`, `MeResponse.document`.

This task has no new domain/application behavior to unit-test — it's plumbing that lets already-tested use cases receive/return the new field over HTTP. Verification happens via the E2E suite in Task 13. Apply the following edits directly (no TDD cycle needed, since these are typed pass-through DTOs with no logic of their own):

```ts
// app/src/interface-adapters/user/requests/create-user-request.ts
import { UserRole } from '@domain/enums/user-role.enum';

export interface CreateUserRequest {
  name: string;
  email: string;
  document: string;
  password: string;
  role: UserRole;
}
```

```ts
// app/src/interface-adapters/user/requests/update-user-request.ts
import { UserRole } from '@domain/enums/user-role.enum';

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  document?: string;
  password?: string;
  role?: UserRole;
}
```

```ts
// app/src/interface-adapters/user/responses/user.response.ts
import { UserRole } from '@domain/enums/user-role.enum';
import { PaginationMeta } from '@domain/interfaces/common/pagination.interface';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  document: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDataResponse {
  data: UserResponse;
}

export interface UserPaginatedResponse {
  data: UserResponse[];
  pagination: PaginationMeta;
}
```

```ts
// app/src/interface-adapters/user/user.presenter.ts
import { UserPublicView } from '@domain/entities/user.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { UserDataResponse, UserPaginatedResponse, UserResponse } from './responses/user.response';

export class UserPresenter {
  static toResponse(user: UserPublicView): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      document: user.document,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toDataResponse(user: UserPublicView): UserDataResponse {
    return { data: UserPresenter.toResponse(user) };
  }

  static toPaginatedResponse(result: PaginatedResult<UserPublicView>): UserPaginatedResponse {
    return {
      data: result.items.map((u) => UserPresenter.toResponse(u)),
      pagination: result.pagination,
    };
  }
}
```

```ts
// app/src/interface-adapters/auth/requests/login-request.ts
export interface LoginRequest {
  identifier: string;
  password: string;
}
```

```ts
// app/src/interface-adapters/auth/responses/auth.response.ts
import { UserRole } from '@domain/enums/user-role.enum';

export interface AuthUserSummaryResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserSummaryResponse;
}

export interface AuthDataResponse {
  data: AuthResponse;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  document: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeDataResponse {
  data: MeResponse;
}
```

```ts
// app/src/infrastructure/http/controllers/user/dto/requests/create-user-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@domain/enums/user-role.enum';
import { IsValidCpfCnpj } from '@infrastructure/http/validators/document.validator';
import { PASSWORD_REGEX } from '@domain/constants/regex/password.regex';
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '@domain/constants/validation/user.constants';

export class CreateUserRequestDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo (mín. 3 caracteres)' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MinLength(MIN_NAME_LENGTH, {
    message: `O nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`,
  })
  @MaxLength(MAX_NAME_LENGTH, {
    message: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`,
  })
  name!: string;

  @ApiProperty({ example: 'joao@email.com', description: 'E-mail único' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email!: string;

  @ApiProperty({
    description: 'CPF (000.000.000-00) ou CNPJ válido, único',
    example: '123.456.789-09',
  })
  @Transform(({ value }: { value: string }) => value?.replaceAll(/[.\-/]/g, '').toUpperCase())
  @IsString({ message: 'O documento deve ser um texto.' })
  @IsNotEmpty({ message: 'O documento é obrigatório' })
  @IsValidCpfCnpj()
  document!: string;

  @ApiProperty({
    example: 'Senha@123',
    description:
      'Senha (mín. 8 caracteres, com ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial)',
  })
  @IsString({ message: 'A senha deve ser um texto.' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ATTENDANT, description: 'Role do usuário' })
  @IsNotEmpty({ message: 'A role é obrigatória' })
  @IsEnum(UserRole, { message: 'Role inválida' })
  role!: UserRole;
}
```

```ts
// app/src/infrastructure/http/controllers/user/dto/requests/update-user-request.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@domain/enums/user-role.enum';
import { IsValidCpfCnpj } from '@infrastructure/http/validators/document.validator';
import { PASSWORD_REGEX } from '@domain/constants/regex/password.regex';
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '@domain/constants/validation/user.constants';

export class UpdateUserRequestDto {
  @ApiPropertyOptional({ example: 'João Silva', description: 'Nome completo (mín. 3 caracteres)' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  @MinLength(MIN_NAME_LENGTH, {
    message: `O nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`,
  })
  @MaxLength(MAX_NAME_LENGTH, {
    message: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`,
  })
  name?: string;

  @ApiPropertyOptional({ example: 'joao@email.com', description: 'E-mail único' })
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;

  @ApiPropertyOptional({
    description: 'CPF (000.000.000-00) ou CNPJ válido, único',
    example: '123.456.789-09',
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.replaceAll(/[.\-/]/g, '').toUpperCase())
  @IsString({ message: 'O documento deve ser um texto.' })
  @IsValidCpfCnpj()
  document?: string;

  @ApiPropertyOptional({
    example: 'NovaSenha@123',
    description:
      'Nova senha (mín. 8 caracteres, com ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial)',
  })
  @IsOptional()
  @IsString({ message: 'A senha deve ser um texto.' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.MECHANIC })
  @IsOptional()
  @IsEnum(UserRole, {
    message: `A role deve ser uma das seguintes: ${Object.values(UserRole).join(', ')}`,
  })
  role?: UserRole;
}
```

```ts
// app/src/infrastructure/http/controllers/user/dto/responses/user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@domain/enums/user-role.enum';
import { PaginatedResponseDto } from '@infrastructure/http/common/dto/paginated-response.dto';
import {
  UserDataResponse,
  UserPaginatedResponse,
  UserResponse,
} from '@interface-adapters/user/responses/user.response';

export class UserResponseDto implements UserResponse {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'João Silva' })
  name!: string;

  @ApiProperty({ example: 'joao@email.com' })
  email!: string;

  @ApiProperty({ example: '12345678909' })
  document!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ATTENDANT })
  role!: UserRole;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z', format: 'date-time' })
  updatedAt!: Date;
}

export class UserDataResponseDto implements UserDataResponse {
  @ApiProperty({ type: UserResponseDto, description: 'Dados do usuário' })
  data!: UserResponseDto;
}

export class UserPaginatedResponseDto
  extends PaginatedResponseDto<UserResponseDto>
  implements UserPaginatedResponse
{
  @ApiProperty({ type: [UserResponseDto], description: 'Usuários da página atual' })
  data!: UserResponseDto[];
}
```

```ts
// app/src/infrastructure/http/controllers/auth/dto/requests/login-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    example: 'joao@email.com',
    description: 'E-mail ou CPF/CNPJ cadastrado',
  })
  @IsString({ message: 'O identificador deve ser um texto.' })
  @IsNotEmpty({ message: 'O e-mail ou documento é obrigatório' })
  identifier!: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha do usuário' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  password!: string;
}
```

```ts
// app/src/infrastructure/http/controllers/auth/dto/responses/me-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@domain/enums/user-role.enum';
import { MeDataResponse, MeResponse } from '@interface-adapters/auth/responses/auth.response';

export class MeResponseDto implements MeResponse {
  @ApiProperty({ example: 'uuid-here' })
  id!: string;

  @ApiProperty({ example: 'João Silva' })
  name!: string;

  @ApiProperty({ example: 'joao@email.com' })
  email!: string;

  @ApiProperty({ example: '12345678909' })
  document!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ATTENDANT })
  role!: UserRole;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-20T12:00:00.000Z', format: 'date-time' })
  updatedAt!: Date;
}

export class MeDataResponseDto implements MeDataResponse {
  @ApiProperty({ type: MeResponseDto, description: 'Dados do usuário autenticado' })
  data!: MeResponseDto;
}
```

Note: `AuthUserSummaryResponse`/`AuthResponseDto` (the `user` object embedded in the login/refresh token response) intentionally keeps its current shape (`id`, `name`, `email`, `role`) — the task only requires exposing `document` on user-detail endpoints (`GET /users/:id`, `GET /auth/me`), not on the token payload.

- [ ] **Step 1: Build the project to catch any wiring mistake**

Run: `npm run build`
Expected: exits 0 — this task is pure typed plumbing, so a successful compile is the only local signal (behavioral verification comes from Task 13's E2E tests).

- [ ] **Step 2: Run the full unit suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/src/interface-adapters/user app/src/interface-adapters/auth app/src/infrastructure/http/controllers/user/dto app/src/infrastructure/http/controllers/auth/dto
git commit -m "feat(http): expose document field and identifier-based login over HTTP"
```

---

### Task 11: Seed valid documents for the existing users

**Files:**
- Modify: `app/prisma/seeds/user.seed.ts`

- [ ] **Step 1: Add a valid, unique CPF per seeded user**

```ts
// app/prisma/seeds/user.seed.ts
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
    name: 'Rafael Neves de Oliveira',
    email: 'rafaelneves652@gmail.com',
    document: '52998224725',
    role: UserRole.ADMIN,
  },
  {
    name: 'Guilherme da Rocha Salvador',
    email: 'guilhermedarochasalvador@gmail.com',
    document: '11144477735',
    role: UserRole.ADMIN,
  },
  {
    name: 'Lucas Almeida da Silva',
    email: 'lucas.almeida-silva@hotmail.com',
    document: '96328505300',
    role: UserRole.ADMIN,
  },
  {
    name: 'Ramoon Lincoln Barros Camacho',
    email: 'ramooncamacho@hotmail.com',
    document: '80418734127',
    role: UserRole.ADMIN,
  },
  {
    name: 'Renan Santana Camacho',
    email: 'camacho.renan@gmail.com',
    document: '15350946056',
    role: UserRole.ADMIN,
  },
];

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  console.log('🌱 Seeding users...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  for (const user of users) {
    await prisma.user.upsert({
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

    console.log(`  ✔ ${user.name} (${user.email})`);
  }

  console.log(`✅ ${users.length} users seeded (senha padrão: ${DEFAULT_PASSWORD})`);
}
```

Each `document` above is a distinct, checksum-valid CPF (verify any of them with `DocumentValidator.validateCpf` if in doubt — they follow the standard algorithm, no real person's document).

- [ ] **Step 2: Re-run the seed against your local dev database**

Run: `npm run db:reset`
Expected: exits 0, logs `✅ 5 users seeded`, and `SELECT document FROM users;` in your local Postgres shows 5 distinct valid CPFs.

- [ ] **Step 3: Commit**

```bash
git add app/prisma/seeds/user.seed.ts
git commit -m "feat(seed): add valid CPF to seeded users"
```

---

### Task 12: E2E helper generates a valid, unique document automatically

**Files:**
- Modify: `app/test/helpers/auth.helper.ts`

**Why this task matters:** `registerAndLogin` is called 26 times across 9 E2E suites (`auth`, `user`, `customer`, `part-supply`, `quote`, `service`, `stock`, `vehicle`, `work-order`). None of those call sites pass a document today. Once `POST /api/users` requires `document`, every one of those 26 calls would start failing with `400` unless the helper supplies a valid, unique one internally — so this fix must land before Task 13 touches the individual E2E specs, and it must require **zero** changes to the other 8 suites that don't otherwise care about documents.

**Interfaces:**
- Consumes: `generateValidCpf` from Task 4 (`app/test/helpers/document.helper.ts`).
- Produces: `registerAndLogin`'s public signature is unchanged, except `overrides` gains an optional `document` for the few tests that need to control it explicitly.

- [ ] **Step 1: Implement**

```ts
// app/test/helpers/auth.helper.ts
import type { Server } from 'http';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '@infrastructure/persistence/prisma/prisma.service';
import { generateValidCpf } from './document.helper';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: string };
}

let sequence = 0;

export async function registerAndLogin(
  app: Server,
  overrides: {
    name?: string;
    email?: string;
    document?: string;
    password?: string;
    role?: string;
  } = {},
  prisma?: PrismaService,
): Promise<AuthTokens> {
  const uid = Date.now();
  sequence += 1;

  const name = overrides.name ?? `Test User ${uid}`;
  const email = overrides.email ?? `testuser${uid}@e2e.test`;
  const document = overrides.document ?? generateValidCpf(uid + sequence);
  const password = overrides.password ?? 'Test@2026';
  const role = overrides.role ?? 'ADMIN';

  if (prisma) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        email,
        document,
        passwordHash: hashedPassword,
        role: role as 'ADMIN' | 'MECHANIC' | 'ATTENDANT',
      },
    });
  } else {
    await request(app)
      .post('/api/users')
      .send({ name, email, document, password, role })
      .expect(201);
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: email, password })
    .expect(200);
  const { accessToken, refreshToken, user } = loginRes.body.data;

  return { accessToken, refreshToken, user };
}
```

`sequence` (a module-level counter) is combined with `Date.now()` because `registerAndLogin` can be called multiple times within the same millisecond in a tight test loop — `Date.now()` alone could produce the same seed (and thus the same CPF) twice in a row, colliding with the real unique constraint. `sequence` guarantees a distinct seed per call even then.

- [ ] **Step 2: Run the full E2E suite**

Run: `npm run test:e2e`
Expected: PASS — all 9 E2E suites still pass unmodified, since `registerAndLogin`'s public contract (its 3 parameters) didn't change, only its internals. `POST /api/auth/login` now receives `identifier` (Task 7/10 renamed the field), so this also validates the login rename end-to-end.

- [ ] **Step 3: Commit**

```bash
git add app/test/helpers/auth.helper.ts
git commit -m "test: generate a valid unique document in the shared E2E auth helper"
```

---

### Task 13: E2E tests for document validation, conflicts, and login by document

**Files:**
- Modify: `app/test/e2e/user.e2e-spec.ts`
- Modify: `app/test/e2e/auth.e2e-spec.ts`

**Note on scope:** most `POST /api/users` bodies in `user.e2e-spec.ts` that already expect `400` (invalid name/email/password/role) do **not** need a `document` added — a missing/invalid document simply adds another validation error to the same `400` response, and those tests only assert the status code (or an `arrayContaining` message check, which tolerates extra array entries). Only bodies that must reach the use case — i.e. tests expecting `201` or `409` — need a valid `document` added. This task lists every one of those.

- [ ] **Step 1: Add `document` to every `POST /api/users` body that expects success, in `user.e2e-spec.ts`**

At the top of the file, alongside the existing imports, add a tiny local counter so each test gets a distinct valid CPF:

```ts
import { generateValidCpf } from '../helpers/document.helper';

let docSeq = 0;
const nextDocument = () => generateValidCpf(Date.now() + docSeq++);
```

Apply `document: nextDocument(),` to the `.send({...})` payload in each of these 9 existing tests. Every edit below shows the exact final code for that `it(...)` block (only the `.send({...})` body changes — everything else in each block is unchanged):

**`'should create a user and return 201'`:**

```ts
it('should create a user and return 201', async () => {
  const res = await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'Novo Usuário',
      email: 'novo@e2e.test',
      document: nextDocument(),
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(201);

  expect(res.body.data).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      name: 'Novo Usuário',
      email: 'novo@e2e.test',
      document: expect.any(String),
      role: 'MECHANIC',
      isActive: true,
    }),
  );
});
```

**`'should return 409 when creating user with duplicate email'`** (two separate `nextDocument()` calls, so the conflict stays about the e-mail, not the document):

```ts
it('should return 409 when creating user with duplicate email', async () => {
  await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'User A',
      email: 'dup@e2e.test',
      document: nextDocument(),
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(201);

  await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'User B',
      email: 'dup@e2e.test',
      document: nextDocument(),
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(409);
});
```

**`'should filter users by role'`** (inline "Create a mechanic" POST, inside `describe('GET /api/users', ...)`):

```ts
it('should filter users by role', async () => {
  // Create a mechanic
  await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'Mechanic Test',
      email: 'mech@test.com',
      document: nextDocument(),
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(201);

  const res = await request(httpServer)
    .get('/api/users?role=MECHANIC')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .expect(200);

  expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  res.body.data.forEach((user: { role: string }) => {
    expect(user.role).toBe('MECHANIC');
  });
});
```

**`'should filter users by name'`** (inline "Create a user with a specific name" POST, same describe block):

```ts
it('should filter users by name', async () => {
  // Create a user with a specific name
  await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'UniqueName Search',
      email: 'unique@test.com',
      document: nextDocument(),
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(201);

  const res = await request(httpServer)
    .get('/api/users?name=UniqueName')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .expect(200);

  expect(res.body.data.length).toBe(1);
  expect(res.body.data[0].name).toBe('UniqueName Search');
});
```

**`'should return user by id'`** (inside `describe('GET /api/users/:id', ...)`):

```ts
it('should return user by id', async () => {
  const createRes = await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'Find Me',
      email: 'findme@e2e.test',
      document: nextDocument(),
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(201);

  const userId = createRes.body.data.id;

  const res = await request(httpServer)
    .get(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .expect(200);

  expect(res.body.data.id).toBe(userId);
  expect(res.body.data.name).toBe('Find Me');
});
```

**The `beforeEach` under `describe('PUT /api/users/:id', ...)`:**

```ts
beforeEach(async () => {
  const createRes = await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'Update Me',
      email: 'updateme@e2e.test',
      document: nextDocument(),
      password: 'Senha@123',
      role: 'ATTENDANT',
    })
    .expect(201);
  userId = createRes.body.data.id;
});
```

**`'should return 409 when updating to duplicate email'`** (the inner "Other" POST, same `describe('PUT /api/users/:id', ...)` block):

```ts
it('should return 409 when updating to duplicate email', async () => {
  await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'Other',
      email: 'other@e2e.test',
      document: nextDocument(),
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(201);

  await request(httpServer)
    .put(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({ email: 'other@e2e.test' })
    .expect(409);
});
```

**The `beforeEach` under `describe('PATCH /api/users/:id', ...)`:**

```ts
beforeEach(async () => {
  const createRes = await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'Status User',
      email: 'status@e2e.test',
      document: nextDocument(),
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(201);
  userId = createRes.body.data.id;
});
```

**`'should delete user and return 204'`** (inside `describe('DELETE /api/users/:id', ...)`):

```ts
it('should delete user and return 204', async () => {
  const createRes = await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'Delete Me',
      email: 'deleteme@e2e.test',
      document: nextDocument(),
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(201);

  const userId = createRes.body.data.id;

  await request(httpServer)
    .delete(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .expect(204);

  await request(httpServer)
    .get(`/api/users/${userId}`)
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .expect(404);
});
```

- [ ] **Step 2: Add new document-specific tests to the `POST /api/users` describe block**

```ts
it('should return 400 when document is not a valid CPF/CNPJ', async () => {
  await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'Documento Inválido',
      email: 'docinvalido@e2e.test',
      document: '111.111.111-11',
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(400);
});

it('should return 409 when creating user with duplicate document', async () => {
  const document = nextDocument();

  await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'User A',
      email: 'usera@e2e.test',
      document,
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(201);

  await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'User B',
      email: 'userb@e2e.test',
      document,
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(409);
});

it('should create a user with a valid CNPJ as document', async () => {
  const res = await request(httpServer)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminAuth.accessToken}`)
    .send({
      name: 'Pessoa Jurídica',
      email: 'pj@e2e.test',
      document: '12.345.678/0001-95',
      password: 'Senha@123',
      role: 'MECHANIC',
    })
    .expect(201);

  expect(res.body.data.document).toBe('12345678000195');
});
```

- [ ] **Step 3: Run the user E2E suite**

Run: `npm run test:e2e -- user.e2e-spec.ts`
Expected: PASS — every pre-existing test plus the 3 new ones.

- [ ] **Step 4: Update `auth.e2e-spec.ts` for `identifier`-based login**

Update `describe('POST /api/auth/login', ...)`'s 5 existing tests to the exact code below (the `beforeEach` itself is unchanged — `registerAndLogin`'s `overrides.email` is a registration field, not the login body, so it keeps its name; only the login `.send({...})` payloads change from `email` to `identifier`):

```ts
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerAndLogin(
      httpServer,
      {
        name: 'Login User',
        email: 'login@e2e.test',
        password: 'Senha@123',
        role: 'ADMIN',
      },
      ctx.prisma,
    );
  });

  it('should login successfully and return tokens', async () => {
    const res = await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: 'login@e2e.test', password: 'Senha@123' })
      .expect(200);

    expect(res.body.data).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          name: 'Login User',
          email: 'login@e2e.test',
          role: 'ADMIN',
        }),
      }),
    );
  });

  it('should return 401 with wrong password', async () => {
    await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: 'login@e2e.test', password: 'WrongPassword' })
      .expect(401);
  });

  it('should return 401 with non-existent email', async () => {
    await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: 'nope@e2e.test', password: 'Senha@123' })
      .expect(401);
  });

  it('should return 400 with missing fields', async () => {
    await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: 'login@e2e.test' })
      .expect(400);
  });

  it('should return 401 when user is deactivated', async () => {
    await ctx.prisma.user.updateMany({
      where: { email: 'login@e2e.test' },
      data: { isActive: false },
    });

    await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: 'login@e2e.test', password: 'Senha@123' })
      .expect(401);
  });
});
```

Add the import at the top of the file:

```ts
import { generateValidCpf } from '../helpers/document.helper';
```

Then add a new describe block after `describe('POST /api/auth/login', ...)`. It uses `registerAndLogin(..., ctx.prisma)` — the overload that inserts the user directly via Prisma — because creating a user through `POST /api/users` requires an authenticated admin, which is unnecessary setup for a test that only cares about the login step:

```ts
describe('POST /api/auth/login (by document)', () => {
  it('should login successfully using the document as identifier', async () => {
    const cpf = generateValidCpf(Date.now());

    await registerAndLogin(
      httpServer,
      { name: 'Doc Login User', email: 'doclogin@e2e.test', document: cpf },
      ctx.prisma,
    );

    const res = await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: cpf, password: 'Test@2026' })
      .expect(200);

    expect(res.body.data.user.email).toBe('doclogin@e2e.test');
  });

  it('should return 401 for a well-formed but unregistered document', async () => {
    await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: generateValidCpf(Date.now() + 1), password: 'Senha@123' })
      .expect(401);
  });

  it('should return 401 for a malformed identifier that is neither an e-mail nor a document', async () => {
    await request(httpServer)
      .post('/api/auth/login')
      .send({ identifier: 'not-an-email-or-document', password: 'Senha@123' })
      .expect(401);
  });
});
```

- [ ] **Step 5: Run the auth E2E suite**

Run: `npm run test:e2e -- auth.e2e-spec.ts`
Expected: PASS — existing e-mail-based login tests (now using `identifier`) plus the 3 new document-login tests.

- [ ] **Step 6: Run the entire test suite (unit + E2E) as the final regression gate**

Run: `npm test && npm run test:e2e`
Expected: PASS, no failures anywhere.

- [ ] **Step 7: Commit**

```bash
git add app/test/e2e/user.e2e-spec.ts app/test/e2e/auth.e2e-spec.ts
git commit -m "test(e2e): cover document validation, conflicts, and login by document"
```

---

## Post-plan checklist

- [ ] `npm run build` succeeds
- [ ] `npm test` (all unit suites) passes
- [ ] `npm run test:e2e` (all 9 E2E suites) passes
- [ ] `npm run lint` passes (the ESLint fence blocking `@nestjs/*`/`@generated/client` imports in `domain/`/`application/` must still hold — none of the tasks above add such an import to those layers)
- [ ] Swagger (`/api/docs` or equivalent, if enabled) reflects the new `document` field on user endpoints and `identifier` on login
