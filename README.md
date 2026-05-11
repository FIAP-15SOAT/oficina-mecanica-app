# Oficina Mecânica API

Sistema Integrado de Atendimento e Execução de Serviços para oficinas mecânicas. Gestão de ordens de serviço, clientes, veículos, peças, insumos, serviços, orçamentos e estoque.

**Tech Challenge — Fase 1 — Grupo 15SOAT**

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

O projeto segue **Clean Architecture** com separação estrita de quatro camadas e adota práticas de **Domain-Driven Design** — entidades ricas, value objects, agregados (Aggregate Roots), invariantes de domínio e regras de negócio encapsuladas no próprio domínio. As dependências fluem apenas para dentro (Presentation → Application → Domain; Infrastructure implementa contratos do Domain).

```
src/
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
│   └── interfaces/                  # Contratos da camada de domínio
│       ├── common/                  # PaginationInput, PaginatedResult
│       ├── repositories/            # Contratos de repositórios + IUnitOfWork
│       ├── services/                # IEmailSenderService, IHashService, ITokenService
│       └── use-cases/               # Contratos dos casos de uso (consumidos pelos controllers)
│
├── application/                     # Camada de aplicação (orquestração de casos de uso)
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
├── infrastructure/                  # Implementações concretas (framework e serviços externos)
│   ├── auth/                        # JwtStrategy, Guards (JwtAuthGuard, RolesGuard),
│   │                                # @CurrentUser, @Roles, @Public
│   ├── database/prisma/             # PrismaService + PrismaModule (singleton de conexão)
│   ├── exceptions/                  # InfrastructureException, AuthenticationFailedException,
│   │                                # DatabaseOperationException, ServiceIntegrationException,
│   │                                # ConcurrencyException
│   ├── filters/                     # Exception Filters: Domain, Application,
│   │                                # Infrastructure, AllExceptions
│   ├── interceptors/                # DateSerializerInterceptor (ISO 8601 com timezone)
│   ├── mappers/                     # Conversão Prisma model → Entidade de domínio (14 mappers)
│   ├── pipes/                       # SanitizeStringsPipe (global, antes do ValidationPipe)
│   ├── repositories/                # Implementações Prisma (11 repositórios) +
│   │                                # PrismaUnitOfWork + RepositoriesModule (@Global)
│   ├── services/                    # BcryptHashService, JwtTokenService,
│   │                                # MailerEmailSenderService + InfrastructureServicesModule
│   └── validators/                  # IsValidCpfCnpj (adapter class-validator)
│
├── presentation/                    # Camada de apresentação (controllers, DTOs, presenters)
│   ├── auth/                        # AuthController + DTOs + AuthPresenter
│   ├── user/                        # UserController + DTOs + UserPresenter
│   ├── service/                     # ServiceController + ServicesMetricsController +
│   │                                # ServicePresenter + ServiceMetricsPresenter
│   ├── parts-supplies/              # PartsSuppliesController + DTOs + PartSupplyPresenter
│   ├── customers/                   # CustomersController + DTOs + CustomerPresenter
│   ├── vehicles/                    # VehiclesController + DTOs + VehiclePresenter
│   ├── work-order/                  # WorkOrderController + DTOs + WorkOrderPresenter
│   ├── quote/                       # QuoteController + DTOs + QuotePresenter
│   ├── stock/                       # StockMovementsController + StockReservationsController +
│   │                                # StockPresenter
│   ├── common/dto/                  # PaginationDto, PaginatedResponseDto compartilhados
│   └── exceptions/                  # PresentationException, InvalidInputException
│
├── config/                          # Configurações (Swagger)
├── app.module.ts
└── main.ts                          # helmet, CORS (ALLOWED_ORIGINS), SanitizeStringsPipe,
                                     # ValidationPipe, DateSerializerInterceptor, prefixo /api

test/
├── helpers/                         # Mock factories reutilizáveis (incluindo
│                                    # UnitOfWorkMockFactory) e helpers de E2E
│                                    # (auth, db cleanup, test app bootstrap)
├── unit/                            # 132 suites de testes unitários (espelham src/)
│   ├── domain/                      # entities/, value-objects/, validators/
│   ├── application/use-cases/       # auth, customer, part-supply, quote, service,
│   │                                # stock, user, vehicle, work-order
│   ├── infrastructure/              # auth, exceptions, filters, interceptors,
│   │                                # mappers, pipes, repositories, services, validators
│   └── presentation/                # controllers e presenters por domínio +
│                                    # validation-schemas
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

prisma/
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
| `PENDING` | `SENT` | `submit()` (envio para o cliente — exige ao menos um item) |
| `SENT` | `APPROVED` | `approve()` (manual via PATCH ou link de e-mail) |
| `SENT` | `REJECTED` | `reject()` (manual ou via link; `reason` opcional no PATCH) |

Itens (serviços e peças/insumos) só podem ser adicionados, atualizados ou removidos enquanto o orçamento estiver `PENDING`. A OS deve estar em `IN_DIAGNOSIS`, `AWAITING_APPROVAL` ou `REJECTED` para que um novo orçamento possa ser criado para ela.

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

A camada de apresentação também expõe sua hierarquia (`PresentationException` → `InvalidInputException`) para situações em que a entrada precisa ser tratada antes mesmo de alcançar a camada de aplicação. Erros de validação de DTO permanecem cobertos pelo `ValidationPipe` global do NestJS (HTTP 400). Demais exceções não mapeadas são capturadas pelo `AllExceptionsFilter` e devolvidas como **HTTP 500**.

### Decisões de Arquitetura (ADRs)

Decisões arquiteturais relevantes são registradas em [`docs/adr/`](./docs/adr) no formato Markdown:

- [ADR 0001 — Uso do PostgreSQL como Banco de Dados Relacional](./docs/adr/0001-uso-do-postgresql-como-banco-de-dados.md)

## Setup com Docker (recomendado)

Esse modo sobe todos os serviços — PostgreSQL, MailHog e API — em containers. As migrations são executadas automaticamente e o banco é populado com o seed.

```bash
# Clonar o repositório e entrar na pasta
git clone <url-do-repositorio>
cd oficina_mecanica_grupo39

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

```bash
# 1. Instalar dependências
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
| `npm run prisma:generate` | Gera o Prisma Client (`prisma/generated/`) |
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
| POST | `/` | Criar nova OS (`userId` extraído do JWT, número gerado por sequence) | ADMIN, ATTENDANT |
| GET | `/` | Listar (paginado; filtros: `number`, `status`, `customerId`, `vehicleId`, `assignedUserId`) | ADMIN, MECHANIC, ATTENDANT |
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
| POST | `/` | Criar orçamento para uma OS (OS deve estar em `IN_DIAGNOSIS` / `AWAITING_APPROVAL` / `REJECTED`) | ADMIN, MECHANIC, ATTENDANT |
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

132 suites cobrindo todas as camadas (`application/`, `domain/` — incluindo entidades, value objects e validators, `infrastructure/` e `presentation/`). Use-cases são instanciados diretamente com mocks do tipo `jest.Mocked<IRepository>` (ou `jest.Mocked<IUnitOfWork>` onde aplicável) — sem NestJS DI, sem banco de dados. Controllers são testados com mocks dos use-cases via `@nestjs/testing`. As factories de mocks (incluindo `UnitOfWorkMockFactory`) estão em `test/helpers/`, organizadas por entidade.

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

## CI/CD

O workflow `.github/workflows/build.yml` é executado em push para `master` e em pull requests (`opened`, `synchronize`, `reopened`). As etapas:

1. `actions/checkout` com `fetch-depth: 0` (necessário para o Sonar avaliar histórico)
2. `actions/setup-node@v4` (Node 22)
3. `npm ci` — instala dependências
4. `npm run prisma:generate` — gera o Prisma Client (recebe `DATABASE_URL` placeholder, não conecta a banco real)
5. `npm run test:cov` — executa os testes unitários e gera cobertura (`coverage/lcov.info`)
6. **SonarQube Scan** — análise estática e publicação de cobertura via `SonarSource/sonarqube-scan-action` (usa o segredo `SONAR_TOKEN`)

A configuração do Sonar (chave do projeto, organização, exclusões e caminho do `lcov.info`) está em `sonar-project.properties`.

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

Alguns branches (`?`, `??`, `?.`) na camada de apresentação não podem ser cobertos pelos testes E2E. Isso ocorre por design da infraestrutura (JOINs obrigatórios via Prisma `include`) ou por invariantes do domínio (FKs NOT NULL, autenticação JWT). Abaixo, cada caso é documentado com a justificativa.

### `src/presentation/stock/stock.presenter.ts`

| Localização | Branch não coberto | Motivo |
|---|---|---|
| `mapWorkOrderData` — `wo.assignedUser ? ... : null` | Ramo falso (`null`) coberto, ramo verdadeiro depende de cenário com mecânico atribuído | OS sem mecânico atribuído é o caso comum; o JOIN `assignedUser` é opcional na tabela. |
| `toStockMovementResponse` — `item.workOrder ? ... : null` | Ramo verdadeiro/falso conforme tipo de movimento | Movimentações automáticas têm `workOrderId`; manuais podem ter `null`. |

### `src/presentation/work-order/work-order.presenter.ts`

| Localização | Branch não coberto | Motivo |
|---|---|---|
| `toStatusHistoryListResponse` — `entry.changedBy ? ... : null` | Ramo falso (`null`) | O histórico de status iniciado por usuário autenticado sempre persiste `changedById`. Apenas eventos automáticos disparados sem usuário (ex.: envio de orçamento via job interno) registram `null`. |

### `src/presentation/quote/quote.module.ts`

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
