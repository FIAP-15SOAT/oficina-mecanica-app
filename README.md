# Oficina Mecânica API

Sistema Integrado de Atendimento e Execução de Serviços para oficinas mecânicas. Gestão de ordens de serviço, clientes, veículos, peças, insumos, serviços, orçamentos e estoque.

**Tech Challenge — Fase 2 — Grupo 15SOAT**

## Stack

- **Runtime**: Node.js 22 + TypeScript 5
- **Framework**: NestJS 11
- **ORM**: Prisma 7 (driver `@prisma/adapter-pg`, client gerado em `prisma/generated/`)
- **Banco de dados**: PostgreSQL 16
- **Autenticação**: JWT (access + refresh token) com bcrypt — `passport-jwt`
- **E-mail**: Nodemailer + `@nestjs-modules/mailer` (SMTP via MailHog em desenvolvimento)
- **Segurança HTTP**: Helmet, CORS configurável via `ALLOWED_ORIGINS`, `SanitizeStringsPipe` global, `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`)
- **Documentação**: Swagger/OpenAPI (`@nestjs/swagger`) — disponível em `/api/docs`
- **Testes**: Jest + ts-jest (unitários com mocks tipados e E2E com **Testcontainers** + PostgreSQL real)
- **Qualidade**: SonarQube Cloud (Sonar Scan via GitHub Actions)
- **Análise de segurança**: OWASP ZAP (DAST), Semgrep (SAST) e SonarQube — relatórios em `reports/`
- **Containerização**: Docker (multi-stage `node:22-alpine`) + Docker Compose
- **Linting**: ESLint 9 + Prettier 3

## Pré-requisitos

- **Node.js 22+** e **npm** (apenas para o setup local)
- **Docker** + **Docker Compose** (recomendado para subir todos os serviços)
- **Git**

## Arquitetura

O projeto segue **Clean Architecture** com separação estrita de camadas e adota práticas de **Domain-Driven Design** — entidades ricas, value objects, agregados (Aggregate Roots), invariantes de domínio e regras de negócio encapsuladas no próprio domínio. O código-fonte aponta apenas para dentro: `domain/` e `application/` são **livres de framework e ORM** (uma cerca de ESLint proíbe `@nestjs/*` e `@generated/client` nessas camadas e quebra a build se violada). A camada `interface-adapters/` concentra os **Clean Controllers** e **Presenters** (POJOs livres de framework); a borda NestJS (rotas, Swagger, guards, DTOs) fica em `infrastructure/http/` e apenas **delega** ao Clean Controller.

Toda a aplicação fica sob o diretório `app/` na raiz do repositório (código, testes, Prisma e todas as configs de tooling); a raiz guarda apenas concerns transversais (`README.md`, `CLAUDE.md`, `.gitignore`) e as pastas `docs/`, `infra/`, `k8s/`, `collections/`, `reports/` e `openspec/`.

```
app/src/
├── domain/                          # Camada de domínio (regras de negócio puras, sem framework)
│   ├── entities/                    # Entidades ricas com validação de domínio e invariantes
│   │                                # WorkOrder e Quote são Aggregate Roots
│   ├── value-objects/               # Document (CPF/CNPJ), Email, Phone, Plate,
│   │                                # ZipCode, Address, LineItemPrice
│   ├── enums/                       # UserRole, CustomerType, WorkOrderStatus,
│   │                                # WorkOrderServiceStatus, QuoteStatus,
│   │                                # QuoteDecisionAction, StockMovementType, Unit,
│   │                                # PartSupplyCategory, TokenType
│   ├── exceptions/                  # DomainException, DomainValidationException,
│   │                                # EntityNotFoundException, BusinessRuleViolationException
│   ├── constants/                   # Regex compartilhadas (placa, telefone, e-mail, senha)
│   │                                # + limites de validação por agregado
│   ├── validators/                  # DocumentValidator (CPF/CNPJ com dígito verificador)
│   └── interfaces/                  # Contratos da camada de domínio (permanecem no domínio)
│       ├── common/                  # PaginationQuery, PaginatedResult, SortCriterion
│       └── repositories/            # Contratos de repositórios (IRepository) + IUnitOfWork
│
├── application/                     # Camada de aplicação (orquestração de casos de uso, sem framework)
│   ├── ports/
│   │   ├── input/<domínio>/         # I<Nome>UseCase (input ports) + DTOs de entrada
│   │   └── output/                  # IEmailSenderService, IHashService, ITokenService (output ports)
│   ├── use-cases/
│   │   ├── auth/                    # Authenticate, RefreshToken, GetCurrentUser
│   │   ├── user/                    # CRUD + atualização de status
│   │   ├── customer/                # CRUD completo de clientes
│   │   ├── vehicle/                 # CRUD + busca por cliente
│   │   ├── service/                 # CRUD + métricas (individual e agregada paginada)
│   │   ├── part-supply/             # CRUD + movimentação de estoque
│   │   ├── stock/                   # Consulta de movimentações e reservas
│   │   ├── work-order/              # Criação, busca, atualização, status,
│   │   │                            # status de serviços, histórico
│   │   └── quote/                   # CRUD, itens, envio por e-mail, aprovação/rejeição
│   │                                # (Approve/Reject/EmailDecision/UpdateStatus)
│   ├── exceptions/                  # ResourceNotFoundException, ResourceConflictException,
│   │                                # UnauthorizedAccessException
│   └── utils/                       # PaginationUtil (sanitização e cálculo de páginas)
│
├── interface-adapters/<domínio>/    # Adapters livres de framework (POJOs, zero @nestjs/*)
│                                    # domínios: auth, customer, part-supply, quote, service,
│                                    # stock, user, vehicle, work-order
│   ├── <domínio>.controller.ts      # Clean Controller: orquestra o(s) use-case(s) + Presenter
│   ├── <domínio>.presenter.ts       # Entidade → tipo de resposta PURO (sem @ApiProperty)
│   ├── requests/                    # Tipos de request do controller (defaults de paginação aqui)
│   └── responses/                   # <Dom>Response / <Dom>DataResponse / <Dom>PaginatedResponse
│
├── infrastructure/                  # Implementações concretas (framework e serviços externos)
│   ├── http/                        # Borda NestJS — @Controller fino que delega ao Clean Controller
│   │   ├── controllers/<domínio>/   # @Controller + module + dto/requests + dto/responses
│   │   │                            # (@ApiProperty; *ResponseDto implements o tipo puro)
│   │   │                            # domínios no singular; auth em controllers/auth/
│   │   ├── guards/                  # JwtAuthGuard, RolesGuard
│   │   ├── decorators/              # @CurrentUser, @Roles, @Public
│   │   ├── strategies/              # JwtStrategy (Passport)
│   │   ├── filters/                 # Exception Filters: Domain, Application,
│   │   │                            # Infrastructure, AllExceptions
│   │   ├── interceptors/            # DateSerializerInterceptor (ISO 8601 com timezone)
│   │   ├── pipes/                   # SanitizeStringsPipe (global, antes do ValidationPipe)
│   │   ├── validators/              # IsValidCpfCnpj (adapter class-validator)
│   │   └── common/dto/              # PaginationDto, PaginatedResponseDto compartilhados
│   ├── persistence/prisma/          # PrismaService + PrismaModule (singleton de conexão)
│   │   ├── repositories/            # Implementações Prisma (11 repositórios) + PrismaUnitOfWork +
│   │   │                            # RepositoriesModule (@Global) — única pasta a importar @generated/client
│   │   ├── mappers/                 # Conversão Prisma model → Entidade de domínio (14 mappers)
│   │   └── helpers/                 # Helpers de paginação, existência e ordenação (Prisma)
│   ├── services/                    # BcryptHashService, JwtTokenService,
│   │                                # MailerEmailSenderService + InfrastructureServicesModule
│   └── exceptions/                  # InfrastructureException, AuthenticationFailedException,
│                                    # DatabaseOperationException, ServiceIntegrationException,
│                                    # ConcurrencyException
│
├── config/                          # Configurações (Swagger)
├── app.module.ts
└── main.ts                          # helmet, CORS (ALLOWED_ORIGINS), SanitizeStringsPipe,
                                     # ValidationPipe, DateSerializerInterceptor, prefixo /api

app/test/
├── helpers/                         # Mock factories reutilizáveis (incluindo
│                                    # UnitOfWorkMockFactory) e helpers de E2E
│                                    # (auth, db cleanup, test app bootstrap)
├── unit/                            # 151 suites de testes unitários (espelham src/)
│   ├── domain/                      # entities/, value-objects/, validators/
│   ├── application/use-cases/       # auth, customer, part-supply, quote, service,
│   │                                # stock, user, vehicle, work-order
│   ├── interface-adapters/          # Clean Controllers + Presenters por domínio
│   └── infrastructure/              # http/ (controllers, filters, interceptors, pipes,
│                                    # validators, auth), persistence/prisma, services
└── e2e/                             # 10 suites de testes E2E (Testcontainers + PostgreSQL real)
    ├── all-exceptions.filter.e2e-spec.ts
    ├── auth.e2e-spec.ts
    ├── customer.e2e-spec.ts
    ├── part-supply.e2e-spec.ts
    ├── quote.e2e-spec.ts
    ├── service.e2e-spec.ts
    ├── stock.e2e-spec.ts
    ├── user.e2e-spec.ts
    ├── vehicle.e2e-spec.ts
    └── work-order.e2e-spec.ts

app/prisma/
├── schema.prisma                    # Schema do banco (15 modelos, 8 enums)
├── prisma.config.ts                 # Configuração do Prisma v7 (adapter-pg)
├── migrations/                      # Migrations geradas pelo Prisma — inclui a sequence
│                                    # `work_order_number_seq` (números de OS),
│                                    # endurecimento de cascade deletes,
│                                    # versionamento (colunas `version`) e índices
├── generated/                       # Prisma Client gerado (output local)
├── seed.ts                          # Entry point do seed
└── seeds/                           # Scripts de seed por entidade (user, customer, vehicle,
                                     # service, part-supply, work-order)
```

### Modelos do banco de dados

15 modelos: `User`, `Customer`, `Address`, `Vehicle`, `Service`, `PartSupply`, `WorkOrder`, `WorkOrderService`, `WorkOrderPartSupply`, `Quote`, `QuoteService`, `QuotePartSupply`, `StatusHistory`, `StockMovement`, `StockReservation`.

Enums refletidos no banco: `UserRole`, `CustomerType`, `WorkOrderStatus`, `WorkOrderServiceStatus`, `QuoteStatus`, `StockMovementType`, `Unit`, `PartSupplyCategory`.

Convenções de modelagem:

- **IDs**: `uuid` v4 (`@db.Uuid`) gerados pelo Prisma — exceto o número da OS, gerado por uma **sequence PostgreSQL** (`work_order_number_seq`, formatada com 6 dígitos zero-padded — `000001`, `000002`, …).
- **Timestamps**: `created_at` / `updated_at` em todas as entidades não-imutáveis (Address, StatusHistory, StockMovement e StockReservation guardam apenas `created_at`).
- **Concorrência otimista**: coluna `version Int @default(1)` em `WorkOrder`, `Quote` e `PartSupply`.
- **Cascade deletes** para itens dependentes (`WorkOrderService`, `WorkOrderPartSupply`, `QuoteService`, `QuotePartSupply`, `StatusHistory`, `StockReservation`, `Address`).
- **`StockMovement.workOrderId`** usa `onDelete: SetNull` para preservar histórico de movimentação após exclusão da OS.
- **Unicidade**: `User.email`, `Customer.email`, `Customer.document`, `Vehicle.plate`, `PartSupply.sku`, `Service.name`, `WorkOrder.number`.
- **Address** é um perfil 1-1 do Customer — chave primária é `customer_id` (sem ID/timestamps próprios) e é deletado em cascata com o Customer.
- **Identidades compostas**: `WorkOrderService`, `WorkOrderPartSupply`, `QuoteService` e `QuotePartSupply` usam chave primária composta `(parentId, itemId)` em vez de surrogate key.
- **Índices secundários** por colunas usadas em filtros (`status`, `customerId`, `vehicleId`, `assignedUserId`, `partSupplyId`, `workOrderId`, etc.) e índice composto `(status, createdAt)` em `WorkOrder` para listagens ordenadas.

### DDD — Aggregate Roots, Entidades e Value Objects

O domínio é modelado seguindo princípios de DDD:

- **Aggregate Roots** — `WorkOrder` e `Quote` são raízes de agregado. Toda mutação de itens (serviços, peças/insumos), transições de status e cálculos de totais ocorrem **através** da raiz, que protege os invariantes do agregado.
  - `WorkOrder` encapsula seus `WorkOrderService[]` e `WorkOrderPartSupply[]`, controla as transições de status (state machine), recalcula `totalAmount`, valida o mecânico atribuído (apenas usuários ativos com role `MECHANIC`) e aplica os itens herdados de um orçamento aprovado (`applyQuoteItems`). Os serviços iniciam/finalizam pela raiz (`startServiceItem` / `completeServiceItem`), que promove a OS para `IN_PROGRESS` no primeiro `start` e para `COMPLETED` quando todos os serviços estão concluídos.
  - `Quote` encapsula seus `QuoteService[]` e `QuotePartSupply[]`, recalcula `servicesAmount` / `partsAmount` / `totalAmount` automaticamente e expõe operações `submit()`, `approve()` e `reject()` que validam o status atual antes da transição.
- **Entidades** — `Customer`, `Vehicle`, `Service`, `PartSupply`, `User`, `StatusHistory`, `StockMovement`, `StockReservation`, `WorkOrderService`, `WorkOrderPartSupply`, `QuoteService`, `QuotePartSupply`. Possuem identidade própria, estado mutável e validações de invariantes nos próprios métodos (`changeRole`, `changePassword`, `reserve`, `release`, etc.).
- **Value Objects** — imutáveis, sem identidade, validados na criação:
  - `Document` (CPF ou CNPJ com dígito verificador), `Email`, `Phone`, `Plate` (placa antiga `ABC-1234` ou Mercosul `ABC1D23` — sanitizada para maiúsculas e sem hífen), `ZipCode`, `Address`, `LineItemPrice` (quantidade × preço unitário com cálculo de total).
- **Reconstituição** — todas as entidades expõem `static create(...)` (com validações completas) e `static reconstitute(...)` (rehidratação a partir do banco, sem revalidar dados já persistidos). Os mappers da infraestrutura sempre usam `reconstitute`, evitando o custo de revalidar dados já consistentes e permitindo carregar agregados em estados intermediários (ex.: `APPROVED` ou `IN_PROGRESS`) que `create` não autorizaria.
- **Enriquecimento de entidades** — relações expostas em consultas usam **referências completas** (`item.service`, `item.partSupply`, `quote.workOrder`, `wo.customer`, `wo.vehicle`, `wo.assignedUser`) carregadas via Prisma `include`. Os presenters projetam os campos necessários para o cliente HTTP.

### Concorrência otimista

Os agregados expostos a operações concorrentes (`WorkOrder`, `Quote`, `PartSupply`) possuem uma coluna `version` (Int) usada como **lock otimista**. Toda atualização verifica `WHERE id = ? AND version = ?` e incrementa a versão. Quando o Prisma retorna o erro `P2025` (registro não encontrado para o filtro), a infraestrutura traduz para uma `ConcurrencyException`, que o filtro de exceções mapeia para **HTTP 409 Conflict**, instruindo o cliente a tentar novamente.

Esse mecanismo protege fluxos críticos como atualização de status de OS, aprovação/rejeição de orçamentos e movimentações concorrentes de estoque (incluindo reservas durante a aprovação de um orçamento).

### Perfis de usuário (RBAC)

A autorização é feita por papel via `JwtAuthGuard` + `RolesGuard` + decorator `@Roles(...)`. Endpoints podem ser marcados com `@Public()` quando dispensam autenticação (ex.: `/auth/login`, `/auth/refresh`, decisão de orçamento via link assinado).

| Perfil | Permissões |
|---|---|
| `ADMIN` | Acesso completo (usuários, serviços, peças/insumos, clientes, veículos, OS, orçamentos, métricas, estoque) |
| `MECHANIC` | Operação de OS e orçamentos, atualização de status de serviço, consulta de catálogos (serviços, peças/insumos) |
| `ATTENDANT` | Cadastro de clientes/veículos, criação e gestão de OS e orçamentos, movimentação manual de estoque |

### Unit of Work

Operações que tocam múltiplos repositórios são executadas dentro de uma transação Prisma gerenciada pelo contrato `IUnitOfWork`. O `PrismaUnitOfWork` injeta todos os repositórios já conectados à transação ativa em uma única callback (`executeTransaction(repos => ...)`), garantindo atomicidade.

Casos de uso transacionais incluem:

- **Criação de OS** — cria a OS + registra `StatusHistory` inicial.
- **Atualização de status de OS** (`PATCH /work-orders/:id`) — atualiza OS + registra histórico.
- **Atualização de status de serviço da OS** — atualiza item, eventualmente promove OS para `IN_PROGRESS` / `COMPLETED`, consome reservas e gera `StockMovement` de saída quando aplicável, registra histórico.
- **Aprovação de orçamento** — aprova orçamento, reserva estoque, materializa itens na OS, transiciona OS para `APPROVED`, rejeita demais orçamentos pendentes da mesma OS e registra histórico.
- **Rejeição de orçamento** — rejeita orçamento, transiciona OS para `REJECTED` e registra histórico.
- **Envio de orçamento** — transiciona orçamento para `SENT`, eventualmente avança OS para `AWAITING_APPROVAL` e registra histórico, dispara e-mail com tokens assinados.
- **Movimentação manual de estoque** — atualiza `PartSupply` + cria `StockMovement` (com `workOrderId` opcional).
- **Manipulação de itens do orçamento** — adicionar/atualizar/remover serviço ou peça/insumo recalcula totais e persiste o agregado dentro da transação.

### Ciclo de vida da Ordem de Serviço

Transições permitidas (state machine validada no agregado `WorkOrder`):

| De | Transições permitidas |
|---|---|
| `RECEIVED` | `IN_DIAGNOSIS`, `CANCELLED` |
| `IN_DIAGNOSIS` | `AWAITING_APPROVAL`, `CANCELLED` |
| `AWAITING_APPROVAL` | `APPROVED`, `REJECTED`, `CANCELLED` |
| `REJECTED` | `AWAITING_APPROVAL` |
| `APPROVED` | `IN_PROGRESS` |
| `IN_PROGRESS` | `COMPLETED` |
| `COMPLETED` | `DELIVERED` |
| `DELIVERED` | (terminal) |
| `CANCELLED` | (terminal) |

Regras adicionais:

- `CANCELLED` exige `notes` no payload.
- Atualização de campos editáveis (`problemDescription`, `internalNotes`, `mileageAtService`, mecânico) só é permitida em `RECEIVED` ou `IN_DIAGNOSIS`.
- O endpoint `PATCH /work-orders/:id` aceita apenas as transições "operacionais" para `IN_DIAGNOSIS`, `CANCELLED` e `DELIVERED` (validado por `WorkOrder.assertAllowedPatchStatus`). As demais (`AWAITING_APPROVAL`, `APPROVED`, `REJECTED`, `IN_PROGRESS`, `COMPLETED`) são disparadas como efeito colateral dos fluxos de orçamento e dos status de serviço.
- Timestamps `approvedAt`, `rejectedAt`, `startedAt`, `finishedAt` e `deliveredAt` são preenchidos automaticamente pelo agregado quando o status correspondente é atingido.
- Apenas mecânicos **ativos** podem ser atribuídos como `assignedUser` (validado tanto na criação quanto na atualização).
- O número da OS é gerado por uma sequence PostgreSQL (`work_order_number_seq`) e formatado com 6 dígitos zero-padded (`000001`, `000002`, …).

### Ciclo de vida do Orçamento

Transições permitidas no agregado `Quote`:

| De | Transição | Gatilho |
|---|---|---|
| `PENDING` | `SENT` | `submit()` (envio para o cliente — exige ao menos **um serviço**; peças sem serviço não são suficientes) |
| `SENT` | `APPROVED` | `approve()` (manual via PATCH ou link de e-mail) |
| `SENT` | `REJECTED` | `reject()` (manual ou via link; `reason` opcional no PATCH) |

Itens (serviços e peças/insumos) só podem ser adicionados, atualizados ou removidos enquanto o orçamento estiver `PENDING`. A OS deve estar em `IN_DIAGNOSIS`, `AWAITING_APPROVAL` ou `REJECTED` para que um novo orçamento possa ser criado via `POST /quotes`. Exceção: `POST /work-orders` pode criar um orçamento diretamente para uma OS recém-criada (`RECEIVED`) ao receber itens inline — sem passar pelo gate de status, pois a validade é garantida pelo próprio fluxo de criação.

### Estoque, reservas e movimentações

Cada `PartSupply` controla três campos: `stock` (estoque físico), `reservedStock` (já comprometido com OS aprovadas) e `version` (lock otimista). Tipos de movimentação: `ENTRY`, `EXIT`, `ADJUSTMENT`.

Fluxo automático no ciclo de vida da OS:

1. **Aprovação de orçamento** — para cada peça/insumo do quote aprovado, o caso de uso valida estoque disponível (`stock - reservedStock`), incrementa `reservedStock` no `PartSupply` e cria um registro em `StockReservation`. Os itens são materializados como `WorkOrderPartSupply` na OS e o `totalAmount` da OS é recalculado.
2. **Início do primeiro serviço (`IN_PROGRESS`)** — quando um serviço da OS é iniciado e a OS transiciona para `IN_PROGRESS`, todas as reservas vinculadas à OS são consumidas: o `PartSupply` tem `stock` e `reservedStock` decrementados, é criado um `StockMovement` de tipo `EXIT` por reserva (com `reason` automático `"Saída por Ordem de Serviço <número>"`) e os registros de `StockReservation` são removidos.
3. **Movimentação manual** — o endpoint `PATCH /parts-supplies/:id` permite registrar `ENTRY`, `EXIT` ou `ADJUSTMENT` com `reason` e `workOrderId` opcionais, sempre validando que a saída não comprometa o estoque já reservado.

### Aprovação de orçamento por e-mail

Ao chamar `POST /quotes/:id/submissions`:

1. O agregado `Quote` transiciona para `SENT`. A OS, se ainda em `IN_DIAGNOSIS` ou `REJECTED`, avança para `AWAITING_APPROVAL` (com histórico de status registrado).
2. Dois tokens JWT independentes (assinados com `QUOTE_DECISION_TOKEN_SECRET` e expiração de 7 dias) são gerados — um para `APPROVE` e outro para `REJECT`. O payload contém `{ quoteId, action, type: QUOTE_EMAIL_DECISION }`.
3. Um e-mail é enviado ao cliente (via `IEmailSenderService` → MailHog em dev) com dois links absolutos: `GET /quotes/:id/decisions?token=...`. A base URL é configurada por `QUOTE_DECISION_BASE_URL` (default: `http://localhost:${PORT}/api`).
4. O endpoint público `GET /quotes/:id/decisions` (decorator `@Public()`) verifica o token, valida `quoteId` + `action` + `type` (do payload do JWT) e delega para `ApproveQuoteUseCase` ou `RejectQuoteUseCase`. Tokens inválidos ou para outro `quoteId` retornam **HTTP 401**.

### Exceções por Camada

Cada camada tem sua própria hierarquia de exceções, sem dependência de framework HTTP. O mapeamento para status HTTP acontece exclusivamente nos **Exception Filters** registrados como `APP_FILTER` em `app.module.ts` (`AllExceptionsFilter`, `DomainExceptionFilter`, `ApplicationExceptionFilter`, `InfrastructureExceptionFilter`).

| Camada | Exceção | HTTP |
|---|---|---|
| Domain | `DomainValidationException` | 422 |
| Domain | `EntityNotFoundException` | 404 |
| Domain | `BusinessRuleViolationException` | 409 |
| Application | `ResourceNotFoundException` | 404 |
| Application | `ResourceConflictException` | 409 |
| Application | `UnauthorizedAccessException` | 401 |
| Infrastructure | `AuthenticationFailedException` | 401 |
| Infrastructure | `ConcurrencyException` | 409 |
| Infrastructure | `DatabaseOperationException` | 503 |
| Infrastructure | `ServiceIntegrationException` | 503 |

Erros de validação de DTO são cobertos pelo `ValidationPipe` global do NestJS (HTTP 400). Demais exceções não mapeadas são capturadas pelo `AllExceptionsFilter` e devolvidas como **HTTP 500**.

### Decisões de Arquitetura (ADRs)

Decisões arquiteturais relevantes são registradas em [`docs/adr/`](./docs/adr) no formato Markdown:

- [ADR 0001 — Uso do PostgreSQL como Banco de Dados Relacional](./docs/adr/0001-uso-do-postgresql-como-banco-de-dados.md)

## Setup com Docker (recomendado)

Esse modo sobe todos os serviços — PostgreSQL, MailHog e API — em containers. As migrations são executadas automaticamente e o banco é populado com o seed.

```bash
# Clonar o repositório e entrar na pasta da aplicação
git clone <url-do-repositorio>
cd oficina_mecanica_grupo39/app

# (Opcional) Copiar e ajustar variáveis de ambiente
cp .env.example .env

# Subir todos os serviços em background
docker compose up -d --build
```

Após a inicialização:

- **API:** `http://localhost:3000`
- **Swagger:** `http://localhost:3000/api/docs`
- **MailHog (interface web):** `http://localhost:8025`

Para acompanhar os logs em tempo real:

```bash
docker compose logs -f api
```

Para parar e remover os containers:

```bash
docker compose down
```

> O `Dockerfile` é multi-stage (`node:22-alpine` builder + runtime), executa `prisma generate` no build e roda `prisma migrate deploy && prisma db seed && node dist/src/main` no `CMD` final.

## Setup local

Neste modo a API roda diretamente na sua máquina com `npm run start:dev`, enquanto apenas a infraestrutura (PostgreSQL e MailHog) é provida via Docker.

### MailHog

O MailHog é um servidor SMTP de desenvolvimento que captura todos os e-mails enviados pela aplicação (ex.: links de aprovação de orçamentos) sem entregá-los de verdade. Acesse a caixa de entrada em `http://localhost:8025` após subir os serviços de infraestrutura.

As variáveis de ambiente necessárias para integração com o MailHog já estão pré-configuradas no `.env.example`:

```env
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_FROM="Oficina Mecânica <noreply@oficina.local>"
```

### Passo a passo

> Toda a aplicação vive em `app/` (não há `package.json` na raiz). Execute os comandos abaixo — e todos os `npm`/`prisma`/`docker compose` — a partir de `app/`.

```bash
# 1. Entrar na pasta da aplicação e instalar dependências
cd app
npm install

# 2. Copiar e ajustar variáveis de ambiente
cp .env.example .env

# 3. Subir apenas PostgreSQL e MailHog (sem o container da API)
docker compose up postgres mailhog -d

# 4. Configurar banco (migrate + generate + seed)
npm run db:setup

# 5. Iniciar a aplicação em modo watch
npm run start:dev
```

Após a inicialização:

- **API:** `http://localhost:3000`
- **Swagger:** `http://localhost:3000/api/docs`
- **MailHog (interface web):** `http://localhost:8025`

## Comandos

Execute todos os comandos a partir de `app/` (`cd app`) — não há `package.json` na raiz do repositório.

| Comando | Descrição |
|---|---|
| `npm run start` | Inicia a aplicação |
| `npm run start:dev` | Inicia em modo watch (hot reload) |
| `npm run start:prod` | Inicia em modo produção (`node dist/src/main`) |
| `npm run build` | Compila o projeto |
| `npm run test` | Roda testes unitários |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:cov` | Testes unitários com cobertura |
| `npm run test:e2e` | Roda testes E2E |
| `npm run test:e2e:cov` | Testes E2E com cobertura |
| `npm run lint` | Linting com auto-fix |
| `npm run format` | Formata código com Prettier |
| `npm run prisma:generate` | Gera o Prisma Client (`app/prisma/generated/`) |
| `npm run prisma:migrate` | Cria/aplica migrations (dev) |
| `npm run prisma:migrate:prod` | Aplica migrations em produção (`migrate deploy`) |
| `npm run prisma:studio` | Abre o Prisma Studio (GUI do banco) |
| `npm run prisma:seed` | Popula o banco com dados iniciais |
| `npm run db:setup` | `migrate deploy` + `generate` + `seed` (primeiro setup) |
| `npm run db:reset` | Reseta o banco e re-executa o seed (apenas dev — bloqueado em `production` / `staging`) |

## API

Após iniciar a aplicação:

- **Swagger:** `http://localhost:3000/api/docs`
- **Base URL:** `http://localhost:3000/api`

Todas as rotas autenticadas exigem o header `Authorization: Bearer <token>` (access token). Tokens são obtidos em `POST /auth/login` e renovados em `POST /auth/refresh`.

### Endpoints disponíveis

---

**Auth** (`/api/auth`)

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| POST | `/login` | Autenticar e obter tokens (access + refresh) | Público |
| POST | `/refresh` | Renovar tokens com refresh token | Público |
| GET | `/me` | Dados do usuário autenticado | JWT |

---

**Usuários** (`/api/users`) — *ADMIN*

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| POST | `/` | Criar usuário (senha exige maiúscula, minúscula, número e caractere especial) | ADMIN |
| GET | `/` | Listar (paginado; filtros: `name`, `role`) | ADMIN |
| GET | `/:id` | Buscar por ID | ADMIN |
| PUT | `/:id` | Atualizar dados | ADMIN |
| PATCH | `/:id` | Alterar status (ativo/inativo) via `{ active: boolean }` | ADMIN |
| DELETE | `/:id` | Remover | ADMIN |

> A força mínima da senha é definida em `domain/constants/regex/password.regex.ts` e validada **na camada de domínio** (`User.validatePasswordStrength`) além do `@Matches(PASSWORD_REGEX)` aplicado no DTO.

---

**Serviços** (`/api/services`)

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| POST | `/` | Cadastrar serviço | ADMIN |
| GET | `/` | Listar (paginado; filtro: `name`) | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id` | Buscar por ID | ADMIN |
| GET | `/:id/metrics` | Métricas de uso de um serviço (execuções concluídas e tempo médio em minutos) | ADMIN |
| PUT | `/:id` | Atualizar | ADMIN |
| DELETE | `/:id` | Remover | ADMIN |

---

**Métricas de Serviços** (`/api/services-metrics`) — *ADMIN*

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| GET | `/` | Listar métricas de todos os serviços (paginado) | ADMIN |

---

**Peças e Insumos** (`/api/parts-supplies`)

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| POST | `/` | Cadastrar peça ou insumo | ADMIN |
| GET | `/` | Listar estoque (paginado; filtros: `name`, `sku`, `category`, `lowStock`) | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id` | Buscar por ID | ADMIN, ATTENDANT |
| PUT | `/:id` | Atualizar dados | ADMIN |
| PATCH | `/:id` | Movimentar estoque (`ENTRY` / `EXIT` / `ADJUSTMENT`) — gera `StockMovement` | ADMIN, ATTENDANT |
| DELETE | `/:id` | Remover (bloqueado se houver estoque ou reservas vinculadas) | ADMIN |

---

**Clientes** (`/api/customers`) — *ADMIN, ATTENDANT*

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| POST | `/` | Cadastrar cliente (CPF ou CNPJ, endereço obrigatório) | ADMIN, ATTENDANT |
| GET | `/` | Listar (paginado; filtros: `name`, `type`, `document`) | ADMIN, ATTENDANT |
| GET | `/:id` | Buscar por ID | ADMIN, ATTENDANT |
| GET | `/:id/vehicles` | Listar veículos do cliente | ADMIN, ATTENDANT |
| PUT | `/:id` | Atualizar dados (incluindo endereço) | ADMIN, ATTENDANT |
| DELETE | `/:id` | Remover (bloqueado se houver veículos vinculados) | ADMIN, ATTENDANT |

---

**Veículos** (`/api/vehicles`) — *ADMIN, ATTENDANT*

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| POST | `/` | Cadastrar veículo (placa `ABC-1234` ou Mercosul `ABC1D23`) | ADMIN, ATTENDANT |
| GET | `/` | Listar (paginado; filtros: `plate`, `brand`, `customerId`) | ADMIN, ATTENDANT |
| GET | `/:id` | Buscar por ID (retorna cliente aninhado) | ADMIN, ATTENDANT |
| PUT | `/:id` | Atualizar dados (placa normalizada para maiúsculas e sem hífen) | ADMIN, ATTENDANT |
| DELETE | `/:id` | Remover (bloqueado se houver ordens de serviço vinculadas) | ADMIN, ATTENDANT |

---

**Ordens de Serviço** (`/api/work-orders`) — *ADMIN, MECHANIC, ATTENDANT*

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| POST | `/` | Criar nova OS (`userId` extraído do JWT, número gerado por sequence). Aceita opcionalmente `services` e `partsSupplies` — se ao menos um serviço for fornecido, cria um orçamento `PENDING` atomicamente na mesma transação (sem passar pelo gate `ensureCanCreateQuote`). Peças sem serviço → 409. ID desconhecido → 404. | ADMIN, ATTENDANT |
| GET | `/` | Listar (paginado; filtros: `number`, `status`, `customerId`, `vehicleId`, `assignedUserId`). **Por padrão, ordens em `COMPLETED`, `DELIVERED` e `CANCELLED` são omitidas**; use `?status=X` para recuperá-las. | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id` | Buscar por ID (retorna serviços e peças/insumos da OS) | ADMIN, MECHANIC, ATTENDANT |
| PUT | `/:id` | Atualizar OS (apenas em `RECEIVED` / `IN_DIAGNOSIS`; `userId` extraído do JWT) | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:id` | Atualizar status da OS (apenas `IN_DIAGNOSIS`, `CANCELLED`, `DELIVERED`) | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:workOrderId/services/:serviceId` | Atualizar status de um serviço da OS (`IN_PROGRESS` / `COMPLETED`) | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id/status-history` | Histórico de mudanças de status | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id/quotes` | Listar orçamentos da OS (sem itens) | ADMIN, MECHANIC, ATTENDANT |

> Demais transições (`AWAITING_APPROVAL`, `APPROVED`, `REJECTED`, `IN_PROGRESS`, `COMPLETED`) são derivadas automaticamente dos fluxos de orçamento e dos status de serviço — veja "Ciclo de vida da Ordem de Serviço".

---

**Orçamentos** (`/api/quotes`)

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| GET | `/` | Listar (paginado; filtros: `workOrderId`, `status`) | ADMIN, MECHANIC, ATTENDANT |
| POST | `/` | Criar orçamento para uma OS (OS deve estar em `IN_DIAGNOSIS` / `AWAITING_APPROVAL` / `REJECTED`). Aceita opcionalmente `services` e `partsSupplies` inline — sem itens cria orçamento vazio (comportamento original); com itens aplica a regra "ao menos um serviço obrigatório" (peças sem serviço → 409, ID desconhecido → 404). | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id` | Buscar por ID com itens (serviços e peças/insumos) | ADMIN, MECHANIC, ATTENDANT |
| POST | `/:id/services` | Adicionar serviço ao orçamento — body `{ serviceId, quantity }` | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:id/services/:serviceId` | Atualizar quantidade de serviço | ADMIN, MECHANIC, ATTENDANT |
| DELETE | `/:id/services/:serviceId` | Remover serviço do orçamento | ADMIN, MECHANIC, ATTENDANT |
| POST | `/:id/parts-supplies` | Adicionar peça/insumo ao orçamento — body `{ partSupplyId, quantity }` | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:id/parts-supplies/:partSupplyId` | Atualizar quantidade de peça/insumo | ADMIN, MECHANIC, ATTENDANT |
| DELETE | `/:id/parts-supplies/:partSupplyId` | Remover peça/insumo do orçamento | ADMIN, MECHANIC, ATTENDANT |
| POST | `/:id/submissions` | Enviar orçamento para aprovação do cliente (envia e-mail com links assinados) | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:id` | Aprovar (`status=APPROVED`) ou rejeitar (`status=REJECTED` + `reason`) manualmente | ADMIN, ATTENDANT |
| GET | `/:id/decisions` | Aprovar/rejeitar via link de e-mail (token assinado) — `?token=...` (a ação é derivada do payload do token) | Público |

> Itens só podem ser modificados enquanto o orçamento estiver `PENDING`. A aprovação reserva estoque, materializa itens na OS, transiciona a OS para `APPROVED` e rejeita os demais orçamentos pendentes da mesma OS. As listagens (`GET /quotes` e `GET /work-orders/:id/quotes`) intencionalmente omitem os itens — apenas `GET /quotes/:id` retorna o orçamento com seus itens.

---

**Movimentações de Estoque** (`/api/stock-movements`) — *ADMIN, ATTENDANT*

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| GET | `/` | Listar movimentações (paginado; filtros: `partSupplyId`, `type`, `workOrderId`, `startDate`, `endDate`) | ADMIN, ATTENDANT |

> `startDate` e `endDate` aceitam o formato `yyyy-MM-dd` (validado por `@Matches`) e são convertidos internamente para janelas UTC inclusivas (`startDate 00:00:00.000Z` até `endDate 23:59:59.999Z`).

---

**Reservas de Estoque** (`/api/stock-reservations`) — *ADMIN, ATTENDANT*

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| GET | `/` | Listar reservas ativas (paginado; filtros: `partSupplyId`, `workOrderId`) | ADMIN, ATTENDANT |

---

### Formato de resposta

Recurso único — envolto em `{ data: ... }`:

```json
{ "data": { "id": "...", "name": "..." } }
```

Lista paginada — envolto em `{ data: [...], pagination: { ... } }`:

```json
{
  "data": [{ "id": "...", "name": "..." }],
  "pagination": {
    "totalRecords": 42,
    "totalPages": 5,
    "page": 1,
    "limit": 10
  }
}
```

`page` (default `1`, mínimo `1`) e `limit` (default `10`, mínimo `1`, máximo `100`) são padronizados no `PaginationDto` e aplicáveis a todos os endpoints paginados.

Erros seguem o padrão NestJS com mensagens em português:

```json
{ "statusCode": 404, "error": "Not Found", "message": "Recurso não encontrado" }
```

Conflitos de concorrência otimista retornam **409 Conflict** com mensagem orientando nova tentativa:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Ordem de serviço foi modificada por outra operação. Tente novamente."
}
```

Todas as datas são serializadas em ISO 8601 com fuso horário via `DateSerializerInterceptor` (global).

## Testes

### Unitários

```bash
npm test          # executa os testes
npm run test:cov  # com relatório de cobertura
```

151 suites cobrindo todas as camadas (`application/`, `domain/` — incluindo entidades, value objects e validators —, `interface-adapters/` e `infrastructure/`). Use-cases são instanciados diretamente com mocks do tipo `jest.Mocked<IRepository>` (ou `jest.Mocked<IUnitOfWork>` onde aplicável) — sem NestJS DI, sem banco de dados. Os Clean Controllers são instanciados diretamente com use-cases mockados; a borda HTTP (`@Controller` fino) é exercitada via `jest.spyOn` no Clean Controller real. As factories de mocks (incluindo `UnitOfWorkMockFactory`) estão em `test/helpers/`, organizadas por entidade.

A cobertura é coletada nas camadas `application/` e `domain/`. DTOs, modules, enums, `main.ts`, exceções e arquivos gerados pelo Prisma são excluídos dos thresholds (ver `package.json` → `jest.collectCoverageFrom`).

### E2E

```bash
npm run test:e2e      # executa os testes
npm run test:e2e:cov  # com cobertura
```

10 suites cobrindo todos os domínios (auth, user, customer, vehicle, service, part-supply, work-order, quote, stock) mais uma suite dedicada ao `AllExceptionsFilter`. Os testes E2E sobem um PostgreSQL real via **Testcontainers** (sem necessidade de banco externo) e usam helpers compartilhados em `test/helpers/` (`test-app.helper.ts`, `auth.helper.ts`, `db-cleanup.helper.ts`) para subir o `INestApplication`, autenticar e limpar o banco entre testes. Configuração em `test/jest-e2e.json` (timeout de 10 minutos para acomodar a inicialização dos containers).

O motivo de testar contra um Postgres real (em vez de mocks Prisma) é validar comportamentos que dependem do banco — constraints de unicidade, cascade deletes, sequences, conversões de tipos, índices e a corrida implícita de updates condicionados (`WHERE version = ?`) — e detectar regressões em migrations.

### Postman / Newman

A coleção e o environment estão em `collections/`. Importe `collections/oficina-collection.json` e `collections/oficina-environment.json` no Postman e selecione o environment **"Oficina Mecânica — Local"**.

Antes de executar, preencha as variáveis `adminEmail` e `adminPassword` no environment com as credenciais de um dos usuários criados pelo seed.

Execute os grupos nesta ordem: **Auth → Usuários → Serviços → Peças e Insumos → Clientes → Veículos → Ordens de Serviço → Orçamentos**.

Ou via linha de comando com a aplicação rodando:

```bash
npx newman run collections/oficina-collection.json -e collections/oficina-environment.json
```

## Terraform (IaC)

A infraestrutura foi separada em dois stacks Terraform independentes para reduzir acoplamento e tornar o fluxo de provisionamento previsível:

- `infra/aws-base`: recursos-base de cloud (rede + EKS + ECR)
- `infra/k8s-base`: recursos Kubernetes compartilhados (namespace, banco PostgreSQL e metrics-server)

Essa separação foi adotada para evitar bootstrap complexo do provider Kubernetes no mesmo stack de criação do EKS e para permitir evolução independente entre camada cloud e camada de workloads.

### Estrutura e estados remotos

- Stack cloud: `infra/aws-base`
  - backend S3: `infra/prod-simulated/aws-base/terraform.tfstate`
- Stack workloads: `infra/k8s-base`
  - backend S3: `infra/prod-simulated/k8s-base/terraform.tfstate`
  - consome `terraform_remote_state` do stack `aws-base` para obter endpoint, CA e nome do cluster

### Recursos provisionados

`infra/aws-base`:

- VPC, subnets públicas/privadas, Internet Gateway e NAT Gateway
- EKS cluster
- Repositório ECR para imagens da aplicação

`infra/k8s-base`:

- Namespace compartilhado da solução (`oficina`)
- Banco PostgreSQL no cluster via Secret + Service + StatefulSet (armazenamento efêmero `emptyDir`)
- metrics-server via Helm (necessário para HPA por CPU/memória)

### Entradas e saídas por stack

`infra/aws-base`:

- Entradas principais:
  - `aws_region`, `project_name`, `environment`
  - `kubernetes_version`
  - `eks_cluster_role_name`, `eks_node_role_name`
  - `vpc_cidr`, `public_subnet_cidrs`, `private_subnet_cidrs`
  - `node_instance_type`, `node_desired_size`, `node_min_size`, `node_max_size`
- Saídas principais:
  - `cluster_name`
  - `cluster_endpoint`
  - `cluster_certificate_authority_data`
  - `cluster_version`
  - `vpc_id`, `private_subnet_ids`, `public_subnet_ids`

`infra/k8s-base`:

- Entradas principais:
  - `aws_region`, `project_name`, `environment`
  - `aws_base_state_bucket`, `aws_base_state_key`, `aws_base_state_region` (para leitura de remote state)
  - `k8s_namespace`
  - `k8s_postgres_db`, `k8s_postgres_user`, `k8s_postgres_password`, `k8s_postgres_image`
  - `enable_metrics_server`, `metrics_server_chart_version`
- Dependências de saída consumidas do `aws-base` (via `terraform_remote_state`):
  - `cluster_name` (auth no EKS)
  - `cluster_endpoint`
  - `cluster_certificate_authority_data`
- Saídas principais:
  - `k8s_namespace`
  - `postgres_service_dns`
  - `postgres_service_port`

### Como aplicar localmente

Pré-requisitos:

- Terraform >= 1.11
- Credenciais AWS válidas no ambiente
- Bucket de state remoto já acessível

Ordem de execução (obrigatória):

```bash
# 1) Provisiona base cloud
cd infra/aws-base
terraform init
terraform plan
terraform apply

# 2) Provisiona workloads Kubernetes compartilhados
cd ../k8s-base
terraform init
terraform plan -var="k8s_postgres_password=<SENHA_FORTE>"
terraform apply -var="k8s_postgres_password=<SENHA_FORTE>"
```

No CI, o secret do PostgreSQL é injetado via `TF_VAR_k8s_postgres_password`.

## Kubernetes

Os recursos em Kubernetes foram divididos por responsabilidade:

- Base e dados críticos via Terraform (`infra/k8s-base`)
  - namespace, PostgreSQL e metrics-server
- Aplicação via manifests YAML (`k8s/`)
  - Secret, ConfigMap, Deployment, Service e HPA

### Motivo da divisão

- Recursos de plataforma e dados (namespace, DB, observabilidade mínima) têm ciclo de vida mais estável e exigem rastreabilidade de estado: por isso ficam no Terraform.
- Recursos da aplicação mudam com maior frequência (imagem, envs, escala): por isso ficam em manifests declarativos no diretório `k8s/` e são aplicados no deploy.

### Ownership de recursos

| Recurso | Ownership | Onde é definido/aplicado |
|---|---|---|
| Namespace `oficina` | Terraform | `infra/k8s-base/k8s_namespace.tf` |
| PostgreSQL (Secret, Service, StatefulSet com `emptyDir`) | Terraform | `infra/k8s-base/k8s_postgres.tf` |
| metrics-server | Terraform | `infra/k8s-base/k8s_metrics_server.tf` |
| DB migration Job (`00-db-migrate-job.yaml`) | Workflow de CD | Render + `kubectl apply` (job `db-migrate`) em `.github/workflows/cd.yml` |
| API Secret (`01-api-secret.yaml`) | Workflow de CD | Render + `kubectl apply` em `.github/workflows/cd.yml` |
| API ConfigMap (`02-api-configmap.yaml`) | Workflow de CD | `kubectl apply` em `.github/workflows/cd.yml` |
| API Deployment (`03-api-deployment.yaml`) | Workflow de CD | Render + `kubectl apply` em `.github/workflows/cd.yml` |
| API Service (`04-api-service.yaml`) | Workflow de CD | `kubectl apply` em `.github/workflows/cd.yml` |
| API HPA (`05-api-hpa.yaml`) | Workflow de CD | `kubectl apply` em `.github/workflows/cd.yml` |

### Armazenamento do PostgreSQL: ausência do EBS CSI Driver e uso de `emptyDir`

#### O que foi tentado

Foram exploradas duas abordagens com disco EBS antes de chegar ao `emptyDir`.

**Tentativa 1 — StorageClass `gp2` (padrão do EKS)**

A primeira abordagem utilizou a StorageClass `gp2` criada automaticamente pelo EKS, que usa o provisioner in-tree `kubernetes.io/aws-ebs`. O fluxo esperado era:

1. Terraform cria um `PersistentVolumeClaim` com `storageClassName: gp2`
2. O Kubernetes chama o provisioner para criar um volume EBS `gp2`
3. O StatefulSet do PostgreSQL monta esse volume em `/var/lib/postgresql/data`

Em clusters EKS 1.23+, porém, o recurso de **CSI Migration** está habilitado por padrão: chamadas ao provisioner in-tree `kubernetes.io/aws-ebs` são redirecionadas internamente para o EBS CSI Driver (`ebs.csi.aws.com`). Com o driver em crash (ver seção abaixo), o redirecionamento nunca se completa e o PVC fica `Pending`.

**Tentativa 2 — StorageClass customizada `gp3`**

A segunda abordagem criou explicitamente uma StorageClass com o provisioner `ebs.csi.aws.com` e o tipo de volume `gp3` (mais performático e mais barato que `gp2`):

```hcl
resource "kubernetes_storage_class_v1" "gp3" {
  metadata { name = "gp3" }
  storage_provisioner    = "ebs.csi.aws.com"
  volume_binding_mode    = "WaitForFirstConsumer"
  reclaim_policy         = "Delete"
  allow_volume_expansion = true
  parameters = {
    type      = "gp3"
    encrypted = "true"
  }
}
```

Por chamar o CSI driver diretamente (sem o nível de indireção da CSI Migration), o problema ficou ainda mais explícito: o PVC nunca avançou de `Pending` porque não há nenhum controller funcional para atender a requisição de provisionamento.

#### Por que não funcionou — diagnóstico técnico

**O EBS CSI Driver está instalado, mas sem credenciais IAM.**

O addon `aws-ebs-csi-driver` (v1.60.0) foi implantado no cluster, porém os pods `ebs-csi-controller` entram em `CrashLoopBackOff` imediatamente após o start. O log expõe a causa raiz com precisão:

```
Failed health check: dry-run EC2 API call failed:
no EC2 IMDS role found — operation error ec2imds: GetMetadata, context deadline exceeded
```

O controller tenta obter credenciais AWS de dois lugares, em ordem:

1. **IRSA** (IAM Roles for Service Accounts): uma IAM Role anotada no ServiceAccount `ebs-csi-controller-sa` via `eks.amazonaws.com/role-arn`. O ServiceAccount não possui essa anotação — `serviceAccountRoleArn: NOT SET`.
2. **Instance Profile do node**: a role IAM do node group (`LabEksNodeRole`) não possui a policy `AmazonEBSCSIDriverPolicy`. Nenhuma das políticas atualmente anexadas (`AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy`, `AmazonEC2ContainerRegistryReadOnly`) concede permissão para operações de EBS (`ec2:CreateVolume`, `ec2:AttachVolume`, etc.).

Sem credenciais válidas em nenhum dos dois caminhos, o controller falha no health check interno e reinicia indefinidamente.

**Não foi possível corrigir via Terraform ou CLI** porque o ambiente de laboratório da FIAP (AWS Academy / Learner Lab) bloqueia as permissões IAM necessárias:

| Ação tentada | Resultado |
|---|---|
| `iam:AttachRolePolicy` no node role | `AccessDenied` |
| Definir `serviceAccountRoleArn` no addon via Terraform | Requer `iam:CreateRole` + `iam:CreateOpenIDConnectProvider` para configurar IRSA — também negados |

**Impacto em cadeia no PVC**: ambas as StorageClasses testadas (`gp2` e a `gp3` customizada) usam `volumeBindingMode: WaitForFirstConsumer`, o que significa que o PVC só é vinculado a um volume EBS quando um pod consumidor é agendado. Com o CSI controller em crash, porém, essa distinção se torna irrelevante: nenhum controller está disponível para receber a requisição de provisionamento. O PVC fica em estado `Pending` indefinidamente. O `terraform apply` aguarda o StatefulSet atingir `Ready` e expira com `context deadline exceeded` após o timeout padrão do provider.

#### Por que `emptyDir` foi escolhido

`emptyDir` é um volume efêmero criado pelo próprio Kubernetes no node onde o pod roda. Não requer StorageClass, PVC, CSI driver, nem nenhuma permissão IAM. O pod sobe imediatamente.

A troca — perda de dados ao reiniciar o pod — é aceitável neste contexto específico porque:

1. **O deploy é não-destrutivo, mas o `emptyDir` é efêmero**: o CD roda `prisma migrate deploy` (aplica apenas migrations pendentes, sem apagar dados), então os dados persistem entre deploys. Se o pod do PostgreSQL for reagendado, porém, o `emptyDir` é perdido — nesse caso o schema é recriado no próximo deploy e os dados de referência são repopulados automaticamente pelo job de migração (que roda `migrate deploy` + `db seed` idempotente).
2. **Ambiente acadêmico**: não há dados de usuário reais nem requisito de durabilidade entre reinicializações. O objetivo do projeto é demonstrar a arquitetura e o pipeline, não operar um banco de dados de produção.
3. **Sem alternativa viável no ambiente**: `hostPath` daria falsa sensação de persistência — nodes EKS gerenciados são substituídos pela AWS em atualizações de AMI ou eventos de scale, perdendo os dados da mesma forma, mas com risco de segurança adicional (acesso ao filesystem do host).

#### O que seria necessário em produção

Para um ambiente real, a solução correta seria uma das seguintes, em ordem de preferência:

1. **IRSA para o EBS CSI Driver**: criar uma IAM Role com trust policy para o OIDC provider do cluster e a policy gerenciada `AmazonEBSCSIDriverPolicy`, anotando o ServiceAccount `ebs-csi-controller-sa`. Isso isola as credenciais do driver sem conceder permissões ao node inteiro.
2. **`AmazonEBSCSIDriverPolicy` no node role**: solução mais simples, porém concede permissões de EBS a todos os processos rodando nos nodes — menos seguro que IRSA.
3. **Amazon RDS (PostgreSQL gerenciado)**: elimina completamente o problema de armazenamento no Kubernetes e é o padrão recomendado para workloads de produção na AWS. Não foi aplicado neste projeto devido ao budget limitado do laboratório (créditos AWS Academy de US$ 50), insuficiente para cobrir o custo de uma instância RDS durante o período de desenvolvimento e avaliação.

### Manifestos da aplicação

Arquivos em `k8s/`:

- `00-db-migrate-job.yaml`: Job **one-shot** de migração/seed do banco (`prisma migrate deploy` + `db seed`), com placeholders de nome (`JOB_NAME_PLACEHOLDER`) e imagem (`IMAGE_URI_PLACEHOLDER`); renderizado e aplicado pelo job `db-migrate` do CD antes do rollout — não é um recurso de estado da aplicação, por isso o prefixo `00-`
- `01-api-secret.yaml`: secrets da aplicação (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` e `QUOTE_DECISION_TOKEN_SECRET`), renderizados no pipeline com valores provenientes dos GitHub Secrets
- `02-api-configmap.yaml`: variáveis não sensíveis da aplicação (`NODE_ENV`, `PORT`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION`, `BCRYPT_SALT_ROUNDS`, `MAIL_HOST`, `MAIL_PORT` e `TZ`)
- `03-api-deployment.yaml`: deployment da API com placeholder de imagem (`IMAGE_URI_PLACEHOLDER`), consumo de Secret/ConfigMap e probes de saúde
- `03-mailhog-deployment.yaml`: deployment do MailHog para captura de e-mails enviados pela aplicação
- `04-api-service.yaml`: Service `ClusterIP` da API
- `04-mailhog-service.yaml`: Service `ClusterIP` do MailHog, expondo as portas SMTP (`1025`) e Web UI (`8025`) para acesso interno ao cluster
- `05-api-hpa.yaml`: autoscaling da API por CPU e memória (HPA v2)

### Acesso à aplicação em Kubernetes

O Service da API é publicado como `ClusterIP`, portanto não é acessível diretamente fora do cluster. Para testes e validações manuais, utilize `kubectl port-forward` para criar um túnel entre a sua máquina e o Service da aplicação.

```bash
kubectl port-forward -n oficina svc/oficina-api 3000:3000
```

Após estabelecer o túnel, a aplicação poderá ser acessada localmente através dos seguintes endereços:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`

Para interromper o túnel, pressione `Ctrl+C` no terminal onde o comando estiver em execução.

Caso seja necessário validar se o Service possui endpoints disponíveis:

```bash
kubectl get endpoints oficina-api -n oficina
```

Para acessar a interface web do MailHog executando no cluster:

```bash
kubectl port-forward -n oficina svc/mailhog 8025:8025
```

A interface ficará disponível em:

- MailHog: `http://localhost:8025`

### Health probes (readinessProbe e livenessProbe)

O Deployment da API configura duas probes HTTP GET em `/api/docs` (porta 3000):

| Probe | Finalidade | `initialDelaySeconds` | `periodSeconds` | `failureThreshold` |
|---|---|---|---|---|
| `readinessProbe` | Indica ao Kubernetes quando o pod está pronto para receber tráfego. Enquanto falhar, o pod é retirado do balanceamento sem ser reiniciado. | 10 | 10 | 3 |
| `livenessProbe` | Detecta pods travados que continuam vivos mas não respondem. Ao falhar, o Kubernetes reinicia o container automaticamente. | 30 | 20 | 3 |

O endpoint `/api/docs` (Swagger UI) foi escolhido por ser a única rota pública que retorna HTTP 200 sem autenticação, confirmando que o servidor HTTP está operacional.

O `initialDelaySeconds` da liveness é propositalmente maior (30 s) do que o da readiness (10 s): a readiness remove o pod do tráfego logo cedo se a aplicação ainda não subiu, enquanto a liveness aguarda mais para não reiniciar um pod que está apenas demorando para inicializar.

### Deploy em Kubernetes (manual)

```bash
# Renderiza segredo

export CHANGE_ME_STRONG_PASSWORD=<SENHA_DB>
export JWT_SECRET=<JWT_SECRET>
export JWT_REFRESH_SECRET=<JWT_REFRESH_SECRET>
export QUOTE_DECISION_TOKEN_SECRET=<QUOTE_DECISION_TOKEN_SECRET>

envsubst \
'${CHANGE_ME_STRONG_PASSWORD} ${JWT_SECRET} ${JWT_REFRESH_SECRET} ${QUOTE_DECISION_TOKEN_SECRET}' \
< k8s/01-api-secret.yaml \
> k8s/01-api-secret.rendered.yaml

# Renderiza imagem

sed "s|IMAGE_URI_PLACEHOLDER|<IMAGE_URI>|g" k8s/03-api-deployment.yaml > k8s/03-api-deployment.rendered.yaml

# Aplica recursos da aplicação

kubectl apply -f k8s/01-api-secret.rendered.yaml
kubectl apply -f k8s/02-api-configmap.yaml
kubectl apply -f k8s/03-api-deployment.rendered.yaml
kubectl apply -f k8s/04-api-service.yaml
kubectl apply -f k8s/05-api-hpa.yaml
```

## CI/CD

A automação está dividida por responsabilidade, em quatro workflows:

| Workflow | Arquivo | Gatilho | Responsabilidade |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | `push` em branches de trabalho (`feature/**`, `fix/**`) | Validar a mudança (inclui `terraform plan`) e abrir o PR |
| CD | `.github/workflows/cd.yml` | `push` em `master` (pós-merge) + `workflow_dispatch` | Fluxo de entrega completo: **provisiona a infra (Terraform), builda a imagem, migra o banco e deploya a app** |
| SAST | `.github/workflows/sast.yml` | `pull_request` + `push` em `master` | Análise do SonarCloud (PR + `master`), em paralelo ao CD (não bloqueia o deploy) |
| DAST | `.github/workflows/dast.yml` | `pull_request` → `master` + `workflow_dispatch` | Scan passivo OWASP ZAP da API rodando (autenticado, via OpenAPI), em paralelo ao CI/CD |

O CD faz o **fluxo de entrega ponta a ponta**: aplica o Terraform (infra) **antes** de migrar e deployar. Não há acoplamento por `workflow_run` — a ordem é garantida pelas dependências entre jobs (`needs:`) dentro do próprio CD. Seguindo a prática do HashiCorp, o **`terraform plan` roda no CI** (o revisor vê o diff de infra no PR) e o **`terraform apply` roda no CD** — o merge na `master` (protegida, só via PR com checks verdes) é a aprovação.

### Fluxo de branch e Pull Request

O CI dispara no `push` de uma branch de trabalho e roda todos os jobs de validação em paralelo (fail-fast). Se todos passam, o job `open-pr` abre um Pull Request para `master` — de forma idempotente (não abre duplicado se já existir PR); em pushes seguintes, o CI reexecuta e o `open-pr` vira no-op.

Os jobs pesados **não** são disparados por `pull_request`. O evento `pull_request` (ação `synchronize`) já reexecuta a cada novo push numa branch com PR aberto; disparar por `push` **e** por `pull_request` executaria tudo em dobro. Mantendo o gatilho apenas em `push`, cada commit é validado uma única vez — os check-runs ficam gravados no SHA do commit, e a branch protection da `master` (required status checks) os lê para liberar ou bloquear o merge.

### Controle de concorrência de runs

| Workflow | `group` | `cancel-in-progress` | Porquê |
|---|---|---|---|
| `ci.yml` | `ci-<ref>` | `true` | Um push mais novo torna o run anterior obsoleto; cancelar economiza runners |
| `cd.yml` | `production` | `false` | Nunca interromper um `terraform apply`/deploy no meio; o próximo run enfileira atrás (protege o state do Terraform e o rollout) |
| `sast.yml` | `sast-<pr ou ref>` | `true` | Um push novo no PR/`master` torna a análise anterior obsoleta; cancelar economiza runners |
| `dast.yml` | `dast-<pr ou ref>` | `true` | Um push novo no PR torna o scan anterior obsoleto; cancelar economiza runners |

Todos os jobs do CD rodam sob o GitHub `environment: production` (portão de deploy / regras de proteção) e são gated por `vars.ENABLE_APP_DEPLOY` — o interruptor mestre do fluxo cloud: quando `false`, o CD não provisiona nem deploya (útil quando o lab do Academy está desligado).

### 1) Workflow de CI (`ci.yml`)

Escopo: validação de qualquer branch de trabalho, sempre por completo (sem detecção condicional de mudança — determinístico e consistente).

Jobs (paralelos, fail-fast). Os que precisam do toolchain Node usam o composite `.github/actions/setup-ci` (Node com cache de npm + `npm ci` + `prisma generate`, tudo em `app/`); todas as actions de terceiros são fixadas por commit SHA completo (mitigação de supply-chain):

1. `lint` — `npm run lint`.
2. `unit-tests` — `npm run test:cov`.
3. `e2e-tests` — `npm run test:e2e:cov` (Testcontainers sobe um PostgreSQL descartável no próprio job).
4. `build` — `npm run build`.
5. `db-validation` — sobe um PostgreSQL efêmero (service container) e roda `npm run db:reset` (migrate reset + seed) para provar que as migrations aplicam do zero e o seed funciona. O banco é descartado com o job — nunca toca em ambiente real.
6. `tf-validate` — duas fases. **Validação (sempre roda, sem credencial):** `terraform fmt -check` (recursivo) + `init -backend=false` + `validate` nos dois stacks — ordenada **antes** de qualquer step AWS, então um token expirado nunca mascara um erro de fmt/validate. **Plan (condicional):** configura as credenciais — a própria action `configure-aws-credentials` valida o token via `sts:GetCallerIdentity` (rodada com `continue-on-error`), então o sucesso dela já indica que o lab está acessível; só roda `terraform plan` (`aws-base` e `k8s-base`, este último quando o cluster já foi provisionado) se o lab do AWS Academy estiver acessível — senão pula (registrando o status no _Job Summary_ do run) e o job segue **verde**. No CI, um `plan` que roda e **falha bloqueia** o merge (um plan quebrado quebraria o `apply` no CD); só o caso de ambiente fora / token expirado é tolerado — aí o `plan` é pulado e o job segue verde. Ou seja: o job não falha por indisponibilidade do ambiente, mas falha por erro real de plan.
7. `open-pr` — depende de todos os jobs acima; abre o PR para `master` (com um PAT `OPEN_PR_TOKEN`, para o `sast.yml` rodar no PR desde o primeiro push) se ainda não existir.

### 2) Workflow de CD (`cd.yml`)

Escopo: `push` em `master` (após o merge) e `workflow_dispatch` (provisionar+deployar sob demanda, ex.: lab novo). Roda sob `environment: production`, com concorrência que não cancela execução em andamento. Todos os jobs são gated por `vars.ENABLE_APP_DEPLOY`.

1. `terraform-aws-base` — `init` → `validate` → `plan` → `apply -auto-approve` em `infra/aws-base` (EKS, ECR, VPC…).
2. `terraform-k8s-base` (depende de `aws-base`) — mesmo fluxo em `infra/k8s-base` (namespace, PostgreSQL, `postgres-secret`, metrics-server); recebe a senha via `TF_VAR_k8s_postgres_password`.
3. `build-push-image` (depende de `aws-base`, pelo ECR) — login no ECR, build **único** da imagem e push com tag imutável (`github.sha`) + `latest`; exporta o `image_uri`.
4. `db-migrate` (depende de `k8s-base` + `build-push-image`) — configura kubeconfig, **renderiza o manifesto versionado `k8s/00-db-migrate-job.yaml`** (substituindo o nome único por run e a imagem imutável via `sed`) e aplica o Kubernetes Job (TTL de 2 semanas para auditoria) que roda **`prisma migrate deploy` seguido de `prisma db seed`**: aplica apenas as migrations pendentes (não-destrutivo, nunca reseta) e reafirma os dados de referência de forma idempotente (`upsert`, sem duplicar). Aguarda a conclusão, com diagnóstico e logs em caso de falha.
5. `app-deploy` (depende de `db-migrate` e `build-push-image`) — renderiza `k8s/01-api-secret.yaml` (secrets da aplicação) e `k8s/03-api-deployment.yaml` (imagem imutável), aplica os manifests (`Secret`, `ConfigMap`, `Deployment`, `Service`, `HPA`) e valida o rollout.

**Estados Terraform separados (obrigatório):** `aws-base` e `k8s-base` têm states distintos porque o provider Kubernetes do segundo é configurado a partir dos outputs do primeiro — criar o cluster e usá-lo no mesmo state seria um chicken-and-egg. Por isso são dois jobs sequenciais, e não há mais um `check_aws_base_state`: no fluxo unificado o `aws-base` é sempre aplicado antes, então os outputs já existem quando o `k8s-base` roda.

A imagem roda **somente a aplicação** (`CMD ["node", "dist/src/main"]`). A migração é um passo dedicado — o Job de `db-migrate` no cluster e o serviço one-shot `migrate` no `docker-compose.yml` localmente — nunca embutida no start do container. Isso evita corrida de migração entre réplicas (o HPA escala de 1 a 5 pods) e mantém o mesmo formato local e em produção.

### Seed dos dados de referência

O seed **não** é um passo destrutivo. Como os seeds são idempotentes (`upsert`, sem duplicar; para usuários, a senha só é definida na criação e não é sobrescrita), ele roda junto com a migração no job `db-migrate` (`migrate deploy` + `db seed`) a cada deploy. Assim os dados de referência (incluindo os usuários Admin) são reafirmados sem apagar nada, e um ambiente com armazenamento efêmero (`emptyDir`) se auto-recupera no próximo deploy — sem passo manual.

### 3) Workflow de SAST (`sast.yml`)

Análise do SonarCloud num workflow dedicado. O plano do Sonar do projeto analisa apenas a **branch principal (`master`) e Pull Requests** — não branches de trabalho avulsas —, então o SAST **saiu do CI e do CD** e roda aqui:

- **`pull_request` → `master`**: análise em modo PR (detecção de _New Code_ + decoração do PR).
- **`push` → `master`**: análise da branch principal (relatório consolidado + o baseline que a análise de PR usa como referência).

Roda `test:cov` + Sonar Scan (`projectBaseDir: app`). Com `sonar.qualitygate.wait=true` (em `sonar-project.properties`), o run **fica vermelho se o quality gate reprovar**. Por ser um workflow **separado do CD**, uma análise vermelha na `master` **não bloqueia o deploy** (rodam em paralelo). A configuração do Sonar (chave do projeto, organização, exclusões, caminho do `lcov.info`) está em `sonar-project.properties`.

Como o `open-pr` abre o PR com um **PAT** (`OPEN_PR_TOKEN`) em vez do `GITHUB_TOKEN`, a criação do PR dispara o `sast.yml` — então a análise/decoração aparece **desde o primeiro push** (o `GITHUB_TOKEN` não dispararia workflows no PR criado automaticamente).

### 4) Workflow de DAST (`dast.yml`)

Teste dinâmico de segurança (**DAST**) com **OWASP ZAP**, num workflow dedicado — como o SAST, roda em paralelo ao CI/CD e não bloqueia nenhum deles. Diferente do SAST (separado por limitação do plano do Sonar), o DAST é separado por ter um **ciclo de gatilho próprio**:

- **`pull_request` → `master`**: escaneia o candidato a merge — o gate natural do DAST.
- **`workflow_dispatch`**: execução sob demanda.

Deliberadamente **não** roda em `push` de branch de trabalho (o CI já cobre o loop rápido; subir a stack inteira a cada push seria caro e redundante) nem em `push` → `master` (a `master` é protegida — só entra via PR —, então o scan do PR já cobriu aquele código).

O job sobe a **stack prod-like inteira** a partir do `app/docker-compose.yml` (`-p dast`: `postgres` + `migrate` = `prisma migrate deploy` + `db seed` + `mailhog` + `api` com `NODE_ENV=production`), espera o app responder em `/api/docs` (não há `/health`; é o mesmo path do readinessProbe do k8s), faz login em `POST /api/auth/login` com um admin do seed e roda o `zap-api-scan.py` (`-f openapi`) contra a spec em `/api/docs-json`. Como quase toda rota está atrás do `JwtAuthGuard`, o token JWT é injetado em cada requisição via _replacer_ do ZAP (`ZAP_AUTH_HEADER*`) — sem isso o scan só veria `401`.

O ZAP roda **na rede do compose** (`--network dast_default`, alvo `http://api:3000`): alcança a API pelo nome do serviço e escaneia a mesma imagem que o CD entrega — dá paridade com produção e evita o clássico problema de `localhost` resolver para o próprio container do ZAP. O `.zap/rules.tsv` silencia alertas que não se aplicam a uma API stateless com Bearer JWT (ausência de token anti-CSRF, flags de cookie de sessão).

O job **falha se o ZAP encontrar problemas** — qualquer alerta não marcado como `IGNORE` faz o `zap-api-scan.py` sair com código diferente de zero e o job fica **vermelho**, como acontece com o SAST. O relatório (HTML + JSON) **não se perde**: sobe como artifact do run mesmo quando o job falha (upload com `if: always()`). O `.zap/rules.tsv` é a alavanca de calibração — os primeiros runs provavelmente ficam vermelhos até você marcar os falsos-positivos como `IGNORE` (se falhar em todo WARN for agressivo demais, dá para usar `-I` e marcar como `FAIL` só as regras que devem bloquear). As credenciais do admin do seed vêm de **secrets do repositório** (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`), nunca hardcoded, e são usadas só contra o banco descartável do job. Scan **ativo/destrutivo está fora de escopo** — apenas passivo.

### Secrets e Variables

Para que os workflows e o provisionamento funcionem corretamente, é necessário configurar os secrets e variables do repositório no GitHub. A tabela abaixo é a referência prática de configuração, incluindo onde cada item é usado.

| Tipo | Nome | Usado em | Finalidade |
|---|---|---|---|
| Secret | `AWS_ACCESS_KEY_ID` | `ci.yml`, `cd.yml` | Credencial AWS (Academy) para Terraform, validação e deploy |
| Secret | `AWS_SECRET_ACCESS_KEY` | `ci.yml`, `cd.yml` | Segredo complementar da credencial AWS |
| Secret | `AWS_SESSION_TOKEN` | `ci.yml`, `cd.yml` | Token temporário de sessão (Academy) — expira e precisa ser renovado a cada lab |
| Secret | `SONAR_TOKEN` | `sast.yml` | Autenticação do SonarQube Scan (workflow de SAST: PR + `master`) |
| Secret | `SEED_ADMIN_EMAIL` | `dast.yml` | E-mail do admin do seed usado no login que autentica o scan ZAP (só contra o banco descartável do job) |
| Secret | `SEED_ADMIN_PASSWORD` | `dast.yml` | Senha do admin do seed para o mesmo login — secret para não expor no arquivo do workflow e mascarar nos logs |
| Secret | `OPEN_PR_TOKEN` | `ci.yml` | PAT que o job `open-pr` usa para abrir o PR de modo que dispare o `sast.yml` no PR (o `GITHUB_TOKEN` não dispara workflows) |
| Secret | `K8S_POSTGRES_PASSWORD` | `ci.yml`, `cd.yml` | Senha do PostgreSQL: injetada como `TF_VAR_k8s_postgres_password` no `plan` do stack `k8s-base` (CI `tf-validate`) e no `apply` (CD), e no Secret da aplicação (`app-deploy`) |
| Secret | `JWT_SECRET` | `cd.yml` | Assinatura dos access tokens JWT |
| Secret | `JWT_REFRESH_SECRET` | `cd.yml` | Assinatura dos refresh tokens JWT |
| Secret | `QUOTE_DECISION_TOKEN_SECRET` | `cd.yml` | Assinatura dos tokens de aprovação/rejeição de orçamento enviados por e-mail |
| Variable | `PRISMA_GENERATE_DATABASE_URL` | `ci.yml`, `cd.yml` | URL fake usada apenas pelo `prisma generate` (só parseada, nunca conectada); há fallback embutido nos workflows |
| Variable | `ECR_REPOSITORY` | `cd.yml` | Nome do repositório ECR onde a imagem da aplicação é publicada |
| Variable | `EKS_CLUSTER_NAME` | `cd.yml` | Nome do cluster EKS usado para `aws eks update-kubeconfig` |
| Variable | `K8S_DEPLOYMENT_NAME` | `cd.yml` | Nome do Deployment usado no `kubectl rollout status` |
| Variable | `K8S_NAMESPACE` | `cd.yml` | Namespace onde a aplicação e os Jobs de banco são aplicados |
| Variable | `ENABLE_APP_DEPLOY` | `cd.yml` | Habilita ou desabilita os jobs que tocam o cluster (deploy/migração/seed) |

Os secrets ficam no nível do repositório porque são consumidos por mais de um contexto (as credenciais AWS, por exemplo, são usadas pelo `tf-validate` do CI e por todos os jobs do CD). O `environment: production` do CD funciona como portão de deploy (regras de proteção), não como isolamento de secrets. Como as credenciais são de laboratório do AWS Academy, o `AWS_SESSION_TOKEN` expira quando o lab é reiniciado e precisa ser reconfigurado a cada sessão (ex.: via `gh secret set`).

#### Injeção de secrets da aplicação

- O secret `K8S_POSTGRES_PASSWORD` deve ser forte e diferente dos valores de desenvolvimento local.
- No CD (`cd.yml`), o job `terraform-k8s-base` recebe `K8S_POSTGRES_PASSWORD` como `TF_VAR_k8s_postgres_password` (mesmo valor, nomes diferentes por contexto).
- Esse valor preenche a variável `k8s_postgres_password` no stack `infra/k8s-base`, que cria/atualiza o Secret Kubernetes `postgres-secret`.
- O `postgres-secret` é referenciado pelo StatefulSet do PostgreSQL (`env_from`), portanto essa senha é a credencial efetivamente usada na inicialização do banco no cluster.
- No workflow de deploy (`cd.yml`), o job `app-deploy` também lê `K8S_POSTGRES_PASSWORD` para renderizar o manifesto `k8s/01-api-secret.yaml`, preenchendo a `DATABASE_URL` consumida pela aplicação.

Além da senha do PostgreSQL, o workflow também injeta os secrets:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `QUOTE_DECISION_TOKEN_SECRET`

## Relatórios de Segurança, Qualidade e Cobertura

Relatórios de segurança da aplicação ficam versionados em [`reports/`](./reports). Na raiz de cada ferramenta fica o relatório mais recente, enquanto o histórico é organizado por data no formato `YYYY-MM-DD`.

- **DAST (OWASP ZAP)** — relatórios em [`reports/zap/`](./reports/zap) (HTML e PDF).
- **SAST (Semgrep)** — relatórios em [`reports/semgrep/`](./reports/semgrep).
- **Qualidade e cobertura (SonarQube)** — relatórios em [`reports/sonarqube/`](./reports/sonarqube) (PDF).
- **Resumo executivo consolidado** — disponível em [`reports/others/`](./reports/others).

Mitigações já aplicadas no código:

- Helmet (cabeçalhos de segurança HTTP)
- CORS com lista branca via `ALLOWED_ORIGINS`
- `SanitizeStringsPipe` global (sanitização de inputs em DTOs antes do `ValidationPipe`)
- `ValidationPipe` global com `whitelist: true`, `forbidNonWhitelisted: true` e `transform: true`
- Senhas com bcrypt (`BCRYPT_SALT_ROUNDS`) e regra de força aplicada tanto no DTO quanto no domínio (`User.validatePasswordStrength`)
- JWT com access + refresh token e segredos separados (`JWT_SECRET` / `JWT_REFRESH_SECRET`)
- Token assinado dedicado para o link público de decisão de orçamento (`QUOTE_DECISION_TOKEN_SECRET`), com validação de `quoteId`, `action` e `type`
- Concorrência otimista em agregados sensíveis (`WorkOrder`, `Quote`, `PartSupply`) para evitar lost updates
- Filtros de exceção que nunca expõem stack traces ou detalhes do banco para o cliente

## Variáveis de Ambiente

Veja `.env.example` para todas as variáveis disponíveis.

```env
# Aplicação
PORT=3000
NODE_ENV=development
TZ=America/Sao_Paulo

# Banco de dados
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/techchallenge?schema=public

# Autenticação
JWT_SECRET=your-secret-key
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRATION=7d
BCRYPT_SALT_ROUNDS=12

# Token assinado para o link público de decisão de orçamento (e-mail)
QUOTE_DECISION_TOKEN_SECRET=your-quote-decision-secret-key
# Opcional — base URL usada para montar os links enviados por e-mail
# (default: http://localhost:${PORT}/api)
# QUOTE_DECISION_BASE_URL=https://api.suaempresa.com/api

# CORS — separar múltiplas origens por vírgula
ALLOWED_ORIGINS=http://localhost:3000

# E-mail (MailHog em desenvolvimento)
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_FROM="Oficina Mecânica <noreply@oficina.local>"
```

> **Atenção**: em produção, gere segredos fortes para `JWT_SECRET`, `JWT_REFRESH_SECRET` e `QUOTE_DECISION_TOKEN_SECRET`. Os valores padrão do `docker-compose.yml` são apenas placeholders.

## Cobertura de Testes E2E — Branches Estruturalmente Inalcançáveis

Alguns branches (`?`, `??`, `?.`) nos Presenters (`interface-adapters/`) e na borda HTTP (`infrastructure/http/`) não podem ser cobertos pelos testes E2E. Isso ocorre por design da infraestrutura (JOINs obrigatórios via Prisma `include`) ou por invariantes do domínio (FKs NOT NULL, autenticação JWT). Abaixo, cada caso é documentado com a justificativa.

### `src/interface-adapters/stock/stock.presenter.ts`

| Localização | Branch não coberto | Motivo |
|---|---|---|
| `mapWorkOrderData` — `wo.assignedUser ? ... : null` | Ramo falso (`null`) coberto, ramo verdadeiro depende de cenário com mecânico atribuído | OS sem mecânico atribuído é o caso comum; o JOIN `assignedUser` é opcional na tabela. |
| `toStockMovementResponse` — `item.workOrder ? ... : null` | Ramo verdadeiro/falso conforme tipo de movimento | Movimentações automáticas têm `workOrderId`; manuais podem ter `null`. |

### `src/interface-adapters/work-order/work-order.presenter.ts`

| Localização | Branch não coberto | Motivo |
|---|---|---|
| `toStatusHistoryListResponse` — `entry.changedBy ? ... : null` | Ramo falso (`null`) | O histórico de status iniciado por usuário autenticado sempre persiste `changedById`. Apenas eventos automáticos disparados sem usuário (ex.: envio de orçamento via job interno) registram `null`. |

### `src/infrastructure/http/controllers/quote/quote.module.ts`

| Localização | Branch não coberto | Motivo |
|---|---|---|
| Configuração de `PORT` — `process.env.PORT ?? '3000'` | Ramo direito (`'3000'`) | O arquivo `.env` sempre define `PORT=3000`. Os testes E2E carregam esse arquivo via `ConfigService`, portanto `process.env.PORT` nunca é `undefined` em tempo de execução dos testes. |

> A lista é mantida em sincronia com a implementação atual dos presenters. Branches que dependem de relações obrigatórias (FKs NOT NULL com `include` mandatório) são afirmados com `!` em vez de fallback `??` / `?.`, eliminando o branch antes mesmo de ser gerado.

---

## Seed

O seed cria 5 usuários Admin com senha padrão `Tech@2026`:

| Nome | E-mail | Senha |
|------|--------|-------|
| Guilherme da Rocha Salvador | `guilhermedarochasalvador@gmail.com` | `Tech@2026` |
| Lucas Almeida da Silva | `lucas.almeida-silva@hotmail.com` | `Tech@2026` |
| Rafael Neves de Oliveira | `rafaelneves652@gmail.com` | `Tech@2026` |
| Ramoon Lincoln Barros Camacho | `ramooncamacho@hotmail.com` | `Tech@2026` |
| Renan Santana Camacho | `camacho.renan@gmail.com` | `Tech@2026` |

Use qualquer um desses e-mails com a senha `Tech@2026` no endpoint `POST /api/auth/login` para autenticar e obter o token JWT.

Os scripts de seed em `prisma/seeds/` (`user.seed.ts`, `customer.seed.ts`, `vehicle.seed.ts`, `service.seed.ts`, `part-supply.seed.ts`, `work-order.seed.ts`) são executados em ordem pelo entrypoint `prisma/seed.ts` e populam dados de referência para acelerar o onboarding e os testes manuais.
