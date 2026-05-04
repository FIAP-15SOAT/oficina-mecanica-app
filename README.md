# Oficina Mecânica API

Sistema Integrado de Atendimento e Execução de Serviços para oficinas mecânicas. Gestão de ordens de serviço, clientes, veículos, peças, insumos, serviços, orçamentos e estoque.

**Tech Challenge — Fase 1 — Grupo 15SOAT**

## Stack

- **Runtime**: Node.js 22 + TypeScript 5
- **Framework**: NestJS 11
- **ORM**: Prisma 7 (driver `@prisma/adapter-pg`)
- **Banco de dados**: PostgreSQL 16
- **Autenticação**: JWT (access + refresh token) com bcrypt — `passport-jwt`
- **E-mail**: Nodemailer + `@nestjs-modules/mailer` (SMTP via MailHog em desenvolvimento)
- **Segurança HTTP**: Helmet, CORS configurável via `ALLOWED_ORIGINS`, `SanitizeStringsPipe` global, `ValidationPipe` global (whitelist + transform)
- **Documentação**: Swagger/OpenAPI (`@nestjs/swagger`)
- **Testes**: Jest + ts-jest (unitários e E2E com **Testcontainers** + PostgreSQL real)
- **Qualidade**: SonarQube Cloud (Sonar Scan via GitHub Actions)
- **Análise de segurança**: OWASP ZAP (DAST), Semgrep (SAST) e SonarQube — relatórios em `reports/`
- **Containerização**: Docker (multi-stage `node:22-alpine`) + Docker Compose
- **Linting**: ESLint 9 + Prettier 3

## Pré-requisitos

- **Node.js 22+** e **npm** (apenas para o setup local)
- **Docker** + **Docker Compose** (recomendado para subir todos os serviços)
- **Git**

## Arquitetura

O projeto segue **Clean Architecture** com separação clara de quatro camadas. As dependências fluem apenas para dentro (Presentation → Application → Domain; Infrastructure implementa contratos do Domain).

```
src/
├── domain/                          # Camada de domínio (regras de negócio puras)
│   ├── entities/                    # Entidades ricas com validação de domínio
│   ├── enums/                       # Enums de negócio (UserRole, WorkOrderStatus, QuoteStatus, etc.)
│   ├── exceptions/                  # DomainValidationException, EntityNotFoundException, BusinessRuleViolationException
│   ├── interfaces/                  # Contratos de repositórios e DTOs de use-cases
│   └── validators/                  # DocumentValidator (validação de CPF e CNPJ com dígito verificador)
│
├── application/                     # Camada de aplicação (orquestração de casos de uso)
│   ├── use-cases/
│   │   ├── auth/                    # Authenticate, RefreshToken, GetCurrentUser
│   │   ├── user/                    # CRUD + atualização de status
│   │   ├── customer/                # CRUD completo de clientes
│   │   ├── vehicle/                 # CRUD + busca por cliente
│   │   ├── service/                 # CRUD + métricas por serviço
│   │   ├── part-supply/             # CRUD + movimentação de estoque
│   │   ├── stock/                   # Consulta de movimentações e reservas de estoque
│   │   ├── work-order/              # Criação, consulta, atualização, status, histórico
│   │   └── quote/                   # CRUD de orçamentos, itens, envio, aprovação, decisão via email
│   └── exceptions/                  # ResourceNotFoundException, ResourceConflictException, UnauthorizedAccessException, BadRequestException
│
├── infrastructure/                  # Implementações concretas (framework e serviços externos)
│   ├── auth/                        # JWT Strategy, Guards (JwtAuthGuard, RolesGuard), @CurrentUser, @Roles, @Public
│   ├── database/                    # PrismaService (singleton de conexão)
│   ├── exceptions/                  # AuthenticationFailedException, DatabaseOperationException, ServiceIntegrationException
│   ├── filters/                     # Exception Filters: Domain, Application, Infrastructure, AllExceptions
│   ├── interceptors/                # DateSerializerInterceptor (ISO 8601 com timezone)
│   ├── mappers/                     # Conversão Prisma model → Entidade de domínio
│   ├── pipes/                       # SanitizeStringsPipe (global — sanitiza strings em DTOs)
│   ├── repositories/                # Implementações Prisma de todos os repositórios + PrismaUnitOfWork
│   ├── services/                    # BcryptHashService, JwtTokenService, MailerEmailSenderService
│   └── validators/                  # IsValidCpfCnpj / IsValidCpfCnpjConstraint (adapter class-validator que delega ao DocumentValidator do domain)
│
├── presentation/                    # Camada de apresentação (controllers, DTOs, presenters)
│   ├── auth/                        # AuthController + DTOs
│   ├── user/                        # UserController + DTOs
│   ├── service/                     # ServiceController + ServicesMetricsController + DTOs
│   ├── parts-supplies/              # PartsSuppliesController + DTOs
│   ├── customers/                   # CustomersController + DTOs
│   ├── vehicles/                    # VehiclesController + DTOs
│   ├── work-order/                  # WorkOrderController + DTOs
│   ├── quote/                       # QuoteController + DTOs
│   └── stock/                       # StockMovementsController + StockReservationsController + DTOs
│
├── config/                          # Configurações (Swagger)
├── app.module.ts
└── main.ts                          # helmet, CORS (ALLOWED_ORIGINS), SanitizeStringsPipe, ValidationPipe, DateSerializerInterceptor

test/
├── helpers/                         # Factories de mocks reutilizáveis por entidade (incluindo UnitOfWorkMockFactory)
├── unit/                            # 129 suites de testes unitários (espelham src/)
│   ├── domain/                      # entities/, validators/
│   ├── application/use-cases/
│   ├── infrastructure/              # auth, exceptions, filters, interceptors, mappers, pipes, repositories, services, validators
│   └── presentation/               # controllers e presenters
└── e2e/                             # 9 suites de testes E2E (Testcontainers / PostgreSQL real)
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
├── schema.prisma                    # Schema do banco de dados (15 modelos)
├── prisma.config.ts                 # Configuração do Prisma v7
├── migrations/                      # Migrations geradas pelo Prisma
├── seed.ts                          # Entry point do seed
└── seeds/                           # Scripts de seed por entidade
```

### Modelos do banco de dados

15 modelos: `User`, `Customer`, `Address`, `Vehicle`, `Service`, `PartSupply`, `WorkOrder`, `WorkOrderService`, `WorkOrderPartSupply`, `Quote`, `QuoteService`, `QuotePartSupply`, `StatusHistory`, `StockMovement`, `StockReservation`.

Enums refletidos no banco: `UserRole`, `CustomerType`, `WorkOrderStatus`, `WorkOrderServiceStatus`, `QuoteStatus`, `StockMovementType`, `Unit`, `PartSupplyCategory`.

### Perfis de usuário (RBAC)

A autorização é feita por papel via `JwtAuthGuard` + `RolesGuard` + decorator `@Roles(...)`. Endpoints podem ainda ser marcados com `@Public()` quando dispensam autenticação (ex.: `/auth/login`, decisão de orçamento via link assinado).

| Perfil | Permissões |
|---|---|
| `ADMIN` | Acesso completo (usuários, serviços, peças/insumos, clientes, veículos, OS, orçamentos, estoque) |
| `MECHANIC` | Operação de OS e orçamentos, atualização de status de serviço |
| `ATTENDANT` | Cadastro de clientes/veículos, criação e gestão de OS e orçamentos |

### Unit of Work

Operações críticas que envolvem múltiplos repositórios (criação e atualização de status de OS, atualização de status de serviço) são executadas dentro de uma transação Prisma gerenciada pelo `IUnitOfWork`. O `PrismaUnitOfWork` implementa esse contrato e injeta todos os repositórios já conectados à transação ativa.

### Exceções por Camada

Cada camada tem suas próprias exceções, sem dependência de framework HTTP. O mapeamento para status HTTP acontece exclusivamente nos **Exception Filters** da infraestrutura:

| Camada | Exceção | HTTP |
|---|---|---|
| Domain | `DomainValidationException` | 422 |
| Domain | `EntityNotFoundException` | 404 |
| Domain | `BusinessRuleViolationException` | 409 |
| Application | `ResourceNotFoundException` | 404 |
| Application | `ResourceConflictException` | 409 |
| Application | `UnauthorizedAccessException` | 401 |
| Application | `BadRequestException` | 400 |
| Infrastructure | `AuthenticationFailedException` | 401 |
| Infrastructure | `DatabaseOperationException` | 503 |
| Infrastructure | `ServiceIntegrationException` | 503 |

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

## Setup local

Neste modo a API roda diretamente na sua máquina com `npm run start:dev`, enquanto apenas a infraestrutura (PostgreSQL e MailHog) é provida via Docker.

### MailHog

O MailHog é um servidor SMTP de desenvolvimento que captura todos os e-mails enviados pela aplicação (ex.: links de aprovação de orçamentos) sem entregá-los de verdade. Acesse a caixa de entrada em `http://localhost:8025` após subir os serviços de infraestrutura.

As variáveis de ambiente necessárias para integração com o MailHog já estão pré-configuradas no `.env.example`:

```env
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_FROM=noreply@oficina.local
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
| `npm run start:prod` | Inicia em modo produção |
| `npm run build` | Compila o projeto |
| `npm run test` | Roda testes unitários |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:cov` | Testes unitários com cobertura |
| `npm run test:e2e` | Roda testes E2E |
| `npm run test:e2e:cov` | Testes E2E com cobertura |
| `npm run lint` | Linting com auto-fix |
| `npm run format` | Formata código com Prettier |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Cria/aplica migrations (dev) |
| `npm run prisma:studio` | Abre o Prisma Studio (GUI do banco) |
| `npm run prisma:seed` | Popula o banco com dados iniciais |
| `npm run db:setup` | migrate:deploy + generate + seed (primeiro setup) |
| `npm run db:reset` | Reseta o banco e re-executa o seed (apenas dev) |

## API

Após iniciar a aplicação:

- **Swagger:** `http://localhost:3000/api/docs`
- **Base URL:** `http://localhost:3000/api`

### Endpoints disponíveis

---

**Auth** (`/api/auth`)

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| POST | `/login` | Autenticar e obter tokens | Público |
| POST | `/refresh` | Renovar tokens com refresh token | Público |
| GET | `/me` | Dados do usuário autenticado | JWT |

---

**Usuários** (`/api/users`) — *ADMIN*

| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Criar usuário |
| GET | `/` | Listar (paginado) |
| GET | `/:id` | Buscar por ID |
| PUT | `/:id` | Atualizar dados |
| PATCH | `/:id` | Alterar status (ativo/inativo) |
| DELETE | `/:id` | Remover |

---

**Serviços** (`/api/services`) — *ADMIN*

| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Cadastrar serviço |
| GET | `/` | Listar (paginado) |
| GET | `/:id` | Buscar por ID |
| GET | `/:id/metrics` | Métricas de uso do serviço |
| PUT | `/:id` | Atualizar |
| DELETE | `/:id` | Remover |

---

**Métricas de Serviços** (`/api/services-metrics`) — *ADMIN*

| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Listar métricas de todos os serviços (paginado) |

---

**Peças e Insumos** (`/api/parts-supplies`) — *ADMIN*

| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Cadastrar peça ou insumo |
| GET | `/` | Listar estoque (paginado; filtros: name, sku, category, isActive, lowStock) |
| GET | `/:id` | Buscar por ID |
| PUT | `/:id` | Atualizar dados |
| PATCH | `/:id/stock` | Movimentar estoque (`ENTRY` / `EXIT` / `ADJUSTMENT`) |
| DELETE | `/:id` | Remover |

---

**Clientes** (`/api/customers`) — *ADMIN, ATTENDANT*

| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Cadastrar cliente (CPF ou CNPJ, endereço obrigatório) |
| GET | `/` | Listar (paginado; filtros: name, type, document) |
| GET | `/:id` | Buscar por ID |
| GET | `/:id/vehicles` | Listar veículos do cliente (paginado) |
| PUT | `/:id` | Atualizar dados (incluindo endereço) |
| DELETE | `/:id` | Remover (bloqueado se houver veículos vinculados) |

---

**Veículos** (`/api/vehicles`) — *ADMIN, ATTENDANT*

| Método | Rota | Descrição |
|---|---|---|
| POST | `/` | Cadastrar veículo (placa `ABC-1234` ou Mercosul `ABC1D23`) |
| GET | `/` | Listar (paginado; filtros: plate, brand, customerId) |
| GET | `/:id` | Buscar por ID (retorna cliente aninhado) |
| PUT | `/:id` | Atualizar dados (placa normalizada para maiúsculas) |
| DELETE | `/:id` | Remover (bloqueado se houver ordens de serviço vinculadas) |

---

**Ordens de Serviço** (`/api/work-orders`) — *ADMIN, MECHANIC, ATTENDANT*

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| POST | `/` | Criar nova OS (`userId` extraído do JWT) | ADMIN, MECHANIC, ATTENDANT |
| GET | `/` | Listar (paginado; filtros: status, customerId, vehicleId, assignedUserId) | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id` | Buscar por ID | ADMIN, MECHANIC, ATTENDANT |
| PUT | `/:id` | Atualizar OS (`userId` extraído do JWT) | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:id` | Atualizar status da OS | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:workOrderId/services/:serviceId` | Atualizar status de um serviço da OS | ADMIN, MECHANIC |
| GET | `/:id/status-history` | Histórico de mudanças de status | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id/quotes` | Listar orçamentos da OS | ADMIN, MECHANIC, ATTENDANT |

Status da OS: `RECEIVED` → `IN_DIAGNOSIS` → `AWAITING_APPROVAL` → `APPROVED` / `REJECTED` → `IN_PROGRESS` → `COMPLETED` → `DELIVERED` / `CANCELLED`

---

**Orçamentos** (`/api/quotes`)

| Método | Rota | Descrição | Perfis |
|---|---|---|---|
| GET | `/` | Listar (paginado; filtros: workOrderId, status) | ADMIN, MECHANIC, ATTENDANT |
| POST | `/` | Criar orçamento para uma OS | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id` | Buscar por ID com itens | ADMIN, MECHANIC, ATTENDANT |
| POST | `/:id/services/:serviceId` | Adicionar serviço ao orçamento | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:id/services/:serviceId` | Atualizar quantidade de serviço | ADMIN, MECHANIC, ATTENDANT |
| DELETE | `/:id/services/:serviceId` | Remover serviço do orçamento | ADMIN, MECHANIC, ATTENDANT |
| POST | `/:id/parts-supplies/:partSupplyId` | Adicionar peça/insumo ao orçamento | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:id/parts-supplies/:partSupplyId` | Atualizar quantidade de peça/insumo | ADMIN, MECHANIC, ATTENDANT |
| DELETE | `/:id/parts-supplies/:partSupplyId` | Remover peça/insumo do orçamento | ADMIN, MECHANIC, ATTENDANT |
| POST | `/:id/submissions` | Enviar orçamento para aprovação do cliente | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:id` | Aprovar ou rejeitar orçamento | ADMIN, ATTENDANT |
| GET | `/:id/decisions` | Decisão via link de e-mail (token assinado) | Público |

Status do orçamento: `PENDING` → `SENT` → `APPROVED` / `REJECTED`

---

**Movimentações de Estoque** (`/api/stock-movements`) — *ADMIN, ATTENDANT*

| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Listar movimentações (paginado; filtros: partSupplyId, type, workOrderId) |

---

**Reservas de Estoque** (`/api/stock-reservations`) — *ADMIN, ATTENDANT*

| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Listar reservas ativas (paginado; filtros: partSupplyId, workOrderId) |

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

Erros seguem o padrão NestJS com mensagens em português:

```json
{ "statusCode": 404, "error": "Não Encontrado", "message": "Recurso não encontrado" }
```

Todas as datas são serializadas em ISO 8601 com fuso horário via `DateSerializerInterceptor`.

## Testes

### Unitários

```bash
npm test          # executa os testes
npm run test:cov  # com relatório de cobertura
```

127 suites cobrindo todas as camadas (`application/`, `domain/`, `infrastructure/`, `presentation/`). Use-cases são instanciados diretamente com mocks do tipo `jest.Mocked<IRepository>` (ou `jest.Mocked<IUnitOfWork>` onde aplicável) — sem NestJS DI, sem banco de dados. Controllers são testados com mocks dos use-cases via `@nestjs/testing`. As factories de mocks estão em `test/helpers/`.

### E2E

```bash
npm run test:e2e      # executa os testes
npm run test:e2e:cov  # com cobertura
```

9 suites cobrindo todos os domínios: auth, user, customer, vehicle, service, part-supply, work-order, quote, stock. Os testes E2E sobem um PostgreSQL real via **Testcontainers**, sem necessidade de banco externo.

### Postman / Newman

A coleção e o environment estão em `collections/`. Importe `collections/oficina-collection.json` e `collections/oficina-environment.json` no Postman e selecione o environment **"Oficina Mecânica — Local"**.

Antes de executar, preencha as variáveis `adminEmail` e `adminPassword` no environment com as credenciais de um dos usuários criados pelo seed.

Execute os grupos nesta ordem: **Auth → Usuários → Serviços → Peças e Insumos → Clientes → Veículos → Ordens de Serviço → Orçamentos**.

Ou via linha de comando com a aplicação rodando:

```bash
npx newman run collections/oficina-collection.json -e collections/oficina-environment.json
```

## CI/CD

O workflow `.github/workflows/build.yml` é executado em push para `master` e em pull requests. As etapas:

1. `npm ci` — instala dependências
2. `npm run prisma:generate` — gera o Prisma Client
3. `npm run test:cov` — executa os testes unitários e gera cobertura (`coverage/lcov.info`)
4. **SonarQube Scan** — análise estática e publicação de cobertura (`SonarSource/sonarqube-scan-action`)

A configuração do Sonar (chave do projeto, organização, exclusões e caminho do `lcov.info`) está em `sonar-project.properties`.

## Relatórios de Segurança, Qualidade e Cobertura

Relatórios de segurança da aplicação ficam versionados em [`reports/`](./reports):
Na raiz de cada ferramenta fica o relatório mais recente, enquanto o histórico é organizado por data no formato `YYYY-MM-DD`.

- **DAST (OWASP ZAP)** — relatórios em [`reports/zap/`](./reports/zap) (HTML e PDF).
- **SAST (Semgrep)** — relatórios em [`reports/semgrep/`](./reports/semgrep).
- **Qualidade e cobertura (SonarQube)** — relatórios em [`reports/sonarqube/`](./reports/sonarqube) (PDF).
- **Resumo executivo consolidado** — disponível em [`reports/others/`](./reports/others).

Mitigações já aplicadas no código:

- Helmet (cabeçalhos de segurança HTTP)
- CORS com lista branca via `ALLOWED_ORIGINS`
- `SanitizeStringsPipe` global (sanitização de inputs em DTOs)
- `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true`
- Senhas com bcrypt (`BCRYPT_SALT_ROUNDS`)
- JWT com access + refresh token e segredos separados
- Token assinado dedicado para o link público de decisão de orçamento (`QUOTE_DECISION_TOKEN_SECRET`)

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

# CORS — separar múltiplas origens por vírgula
ALLOWED_ORIGINS=http://localhost:3000

# E-mail (MailHog em desenvolvimento)
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_FROM="Oficina Mecânica <noreply@oficina.local>"
```

> **Atenção**: em produção, gere segredos fortes para `JWT_SECRET`, `JWT_REFRESH_SECRET` e `QUOTE_DECISION_TOKEN_SECRET`. Os valores padrão do `docker-compose.yml` são apenas placeholders.

## Seed

O seed cria 5 usuários Admin com senha padrão `Tech@2026`:

| Nome | E-mail | Senha |
|------|--------|-------|
| Guilherme da Rocha Salvador | `guilhermedarochasalvador@gmail.com` | `Tech@2026` |
| Lucas Almeida da Silva | `lucas.almeida-silva@hotmail.com` | `Tech@2026` |
| Rafael Neves de Oliveira | `rafaelneves652@gmail.com` | `Tech@2026` |
| Ramoon Lincoln Barros Camacho | `ramooncamacho@hotmail.com` | `Tech@2026` |
| Renan Santana Camacho | `camacho.renan@gmail.com` | `Tech@2026` |

Use qualquer um desses e-mails com a senha `Tech@2026` no endpoint `POST /login` para autenticar e obter o token JWT.
