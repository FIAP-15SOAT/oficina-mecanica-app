# Design: Documento (CPF/CNPJ) no Cadastro de Usuário e Login por Documento

**Data:** 2026-08-19
**Escopo:** Domínio de `User` (entidade, VO compartilhado, validação), caso de uso de login, DTOs HTTP e schema Prisma. Nenhuma regra de negócio de `Customer` é alterada.

---

## Problema

Hoje o cadastro de usuário (`User`) recebe apenas nome, e-mail, senha e role — não há campo de documento. O login (`POST /auth/login`) autentica exclusivamente por e-mail.

Requisito: usuários devem poder ser cadastrados com CPF ou CNPJ e devem poder logar tanto por e-mail quanto por esse documento, com a mesma validação e forma de armazenamento já usadas no cadastro de clientes (`Customer`).

Como o projeto ainda não está em produção, a decisão de negócio é aplicar o campo a **todos** os usuários (obrigatório, único, sem necessidade de coluna opcional para transição).

## Por que não duplicar a validação de `Customer`

O cadastro de clientes já resolve exatamente este problema: um Value Object `Document` (`domain/value-objects/document.vo.ts`) sanitiza o valor e valida CPF/CNPJ via `DocumentValidator` (`domain/validators/document.validator.ts`), que já é agnóstico de entidade — a função `validateCpfCnpj` roteia por tamanho (11 → CPF, 14 → CNPJ) e roda o algoritmo de dígito verificador completo para os dois formatos, incluindo o CNPJ alfanumérico novo da Receita.

O único motivo para não reaproveitar `Document` diretamente em `User` é um acoplamento acidental: `Document.create(value, type)` hoje exige um `CustomerType`, um enum que pertence ao bounded context de `Customer` (usado em ~30 pontos: filtros, responses de stock/work-order/customer). Fazer `User` depender de `CustomerType` inverteria a dependência na direção errada — um conceito específico de `Customer` vazando para `User`.

A correção é generalizar o VO, não contorná-lo.

## Solução

### 1. Extrair `PersonType` como enum genérico do shared kernel

`domain/` já é um único shared kernel para todo o domínio (confirmado em `docs/architecture.md`: `value-objects/` lista `Document (CPF/CNPJ)` e `enums/` lista `CustomerType` lado a lado com os demais enums, sem separação por bounded context). Não existe hoje isolamento entre os domínios de `User` e `Customer` — generalizar `Document` alinha o código com o desenho já documentado.

O nome escolhido é `PersonType`, não `DocumentType`: o CPF/CNPJ é uma *consequência* de a entidade ser pessoa física ou jurídica, não o contrário — e é exatamente essa a linguagem que as mensagens de erro do próprio `Document` já usam (`'Pessoa física deve informar um CPF válido'`, `'Pessoa jurídica deve informar um CNPJ válido'`). `PersonType` nomeia o conceito de domínio real; `Document` apenas o consome.

```ts
// domain/enums/person-type.enum.ts (novo)
export enum PersonType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}
```

```ts
// domain/enums/customer-type.enum.ts (alterado)
export { PersonType as CustomerType } from './person-type.enum';
```

`CustomerType` passa a ser um re-export de `PersonType` — mesmo nome, mesmo caminho de import, mesmos valores. Nenhum dos ~30 call sites de `CustomerType` muda.

### 2. Tornar o `type` opcional em `Document.create`, com autodetecção

```ts
// domain/value-objects/document.vo.ts
static create(value: string, type?: PersonType): Document {
  Document.validatePresence(value);
  const sanitized = Document.sanitize(value);
  const resolvedType = type ?? Document.detectType(sanitized);
  Document.validateMatchesType(sanitized, resolvedType);
  return new Document(sanitized, resolvedType);
}

private static detectType(sanitized: string): PersonType {
  if (sanitized.length === 11) return PersonType.INDIVIDUAL;
  if (sanitized.length === 14) return PersonType.COMPANY;
  throw new DomainValidationException('Documento inválido: informe um CPF ou CNPJ');
}
```

Quando `type` é informado (todo o fluxo de `Customer`, sem mudanças), o comportamento é idêntico ao atual. Quando omitido (fluxo de `User`), o VO autodetecta pelo tamanho — sem precisar de um campo "tipo" redundante no `User`, que poderia ficar dessincronizado do valor real.

Todos os testes existentes de `document.vo.spec.ts` chamam `Document.create(value, CustomerType.X)` com `type` explícito — retrocompatibilidade garantida.

### 3. `User` passa a ter `document: Document`

Igual ao padrão já usado por `Email` (VO compartilhado por `User` e `Customer`):

```ts
// domain/entities/user.entity.ts
interface UserProps {
  ...
  document: Document;
  ...
}

static create(props: CreateUserProps): User {
  ...
  document: Document.create(props.document), // sem type — autodetecção
  ...
}

changeDocument(document: string): void {
  this.document = Document.create(document);
  this.updatedAt = new Date();
}
```

### 4. Unicidade e conflito de cadastro

`CreateUserUseCase` passa a checar duplicidade de documento (`IUserRepository.findByDocument`), mesmo padrão do e-mail e do que já acontece em `CreateCustomerUseCase`:

```ts
const existingDocument = await this.userRepository.findByDocument(sanitizedDocument);
if (existingDocument) {
  throw new ResourceConflictException('Documento já cadastrado no sistema');
}
```

`IUserRepository` ganha `findByDocument(document: string): Promise<User | null>`. `PrismaUserRepository` implementa via `prisma.user.findUnique({ where: { document } })`, mapeando o novo campo nos mappers.

**Não-escopo explícito:** não há e não será criada nenhuma unicidade cruzada entre `User.document` e `Customer.document` — as tabelas não têm relação (`schema.prisma` confirma ausência de FK entre `User` e `Customer`). Uma mesma pessoa pode, em tese, ser cliente e funcionário com o mesmo documento em cada tabela — fora do escopo desta task.

### 5. Login por e-mail OU documento

`LoginRequestDto` troca o campo `email` (`@IsEmail`) por `identifier` (`@IsString @IsNotEmpty`), já que o valor pode ser e-mail ou CPF/CNPJ.

`AuthenticateUserUseCase` decide a estratégia de busca pelo formato do identifier:

```ts
async execute(input: AuthenticateUserInputDto): Promise<AuthenticateUserOutputDto> {
  const user = input.identifier.includes('@')
    ? await this.userRepository.findByEmail(input.identifier)
    : await this.userRepository.findByDocument(sanitize(input.identifier));

  if (!user?.isActive) {
    throw new UnauthorizedAccessException('Credenciais inválidas');
  }
  // resto do fluxo inalterado (compare de senha, emissão de tokens)
}
```

A mensagem de erro genérica `"Credenciais inválidas"` é mantida para **qualquer** falha (identifier não encontrado em nenhuma das duas buscas, senha incorreta, usuário inativo) — preserva a mitigação já documentada em `docs/security.md` contra enumeração de usuários. Não há validação de dígito verificador do documento no login: um identifier malformado simplesmente não casa com nenhum registro e cai no mesmo 401 genérico.

### 6. Banco de dados

Migration Prisma adicionando `document` ao `User`:

```prisma
model User {
  ...
  document String @unique @db.VarChar(18)
  ...
}
```

`NOT NULL` desde já — decisão de negócio confirmada (projeto não está em produção, aplica-se a todos os usuários, sem coluna opcional de transição).

### 7. HTTP DTOs

- `CreateUserRequestDto`: novo campo `document`, com `@Transform` (remove máscara) + `@IsValidCpfCnpj()` — reaproveita o decorator já existente em `infrastructure/http/validators/document.validator.ts` (já agnóstico de tipo, usado hoje em `create-customer-request.dto.ts`).
- `LoginRequestDto`: `email` → `identifier`.
- Responses de usuário (`UserPublicView`, presenters/DTOs de resposta): incluir `document` no output, mesmo padrão do `Customer`.

## Arquivos alterados (visão geral)

| Camada | Arquivo | Mudança |
|---|---|---|
| Domain | `enums/person-type.enum.ts` | novo |
| Domain | `enums/customer-type.enum.ts` | vira re-export |
| Domain | `value-objects/document.vo.ts` | `type` opcional + autodetecção |
| Domain | `entities/user.entity.ts` | campo `document`, `changeDocument()` |
| Domain | `interfaces/repositories/user.repository.interface.ts` | `findByDocument` |
| Application | `use-cases/user/create-user.use-case.ts` | checagem de duplicidade |
| Application | `use-cases/user/update-user.use-case.ts` | suporte a atualizar documento (se existir fluxo de update) |
| Application | `use-cases/auth/authenticate-user.use-case.ts` | login por identifier |
| Application | `ports/input/auth/dto/authenticate-user.dto.ts` | `email` → `identifier` |
| Infrastructure | `persistence/prisma/repositories/*user*` | `findByDocument`, mapeamento |
| Infrastructure | `persistence/prisma/mappers/user.mapper.ts` | mapear `document` |
| Infrastructure | `http/controllers/user/dto/requests/create-user-request.dto.ts` | campo `document` |
| Infrastructure | `http/controllers/auth/dto/requests/login-request.dto.ts` | `email` → `identifier` |
| Infrastructure | `http/controllers/user/dto/responses/*` | incluir `document` |
| Database | `prisma/schema.prisma` + nova migration | coluna `document` em `User` |
| Seed | `prisma/seeds/user.seed.ts` | adicionar CPF válido aos 5 usuários seedados |

## Testes a atualizar/criar

Espelhando a suíte já existente para `Customer`/`Document`:

- Unit: `document.vo.spec.ts` (autodetecção sem `type`), `user.entity.spec.ts` (validação de documento), `create-user.use-case.spec.ts` (conflito de documento duplicado), `authenticate-user.use-case.spec.ts` (login por documento e por e-mail, identifier inválido), mapper do Prisma.
- E2E: `user.e2e-spec.ts` (criação com documento inválido/duplicado), `auth.e2e-spec.ts` (login via CPF/CNPJ, via e-mail, identifier inexistente).

## O que não muda

- Validação de CPF/CNPJ (`DocumentValidator`) — nenhuma alteração no algoritmo.
- Comportamento de `Customer` — 100% preservado (todos os call sites de `CustomerType` e todos os testes de `Document` continuam passando sem alteração).
- RBAC, JWT, refresh token — inalterados.
- Não há unicidade cruzada entre documento de `User` e de `Customer` (ver seção 4).
