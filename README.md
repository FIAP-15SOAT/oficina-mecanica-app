# Oficina Mecânica API

Sistema Integrado de Atendimento e Execução de Serviços para oficinas mecânicas. Gestão de ordens de serviço, clientes, veículos, peças, insumos e serviços.

**Tech Challenge — Fase 1 — Grupo 15SOAT**

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: NestJS
- **ORM**: Prisma 7
- **Banco de dados**: PostgreSQL 16
- **Autenticação**: JWT (access + refresh token) com bcrypt
- **Documentação**: Swagger/OpenAPI
- **Testes**: Jest + ts-jest
- **Containerização**: Docker + Docker Compose
- **Linting**: ESLint + Prettier

## Arquitetura

O projeto segue **Clean Architecture** com separação clara de camadas:

```
src/
├── domain/                          # Camada de domínio (regras de negócio puras)
│   ├── entities/                    # Entidades com lógica de domínio rica
│   ├── enums/                       # Enums de negócio (UserRole, WorkOrderStatus, etc.)
│   ├── exceptions/                  # Exceções de domínio (DomainValidationException, etc.)
│   └── interfaces/                  # Contratos (repositórios, use-cases)
│
├── application/                     # Camada de aplicação (casos de uso)
│   ├── use-cases/
│   │   ├── auth/                    # Register, Authenticate, RefreshToken, GetCurrentUser
│   │   ├── user/                    # CRUD completo de usuários
│   │   ├── part-supply/             # CRUD + movimentação de estoque de peças e insumos
│   │   ├── customer/                # CRUD completo de clientes
│   │   └── vehicle/                 # CRUD completo de veículos
│   └── exceptions/                  # Exceções de aplicação (ResourceNotFound, Conflict, etc.)
│
├── infrastructure/                  # Camada de infraestrutura (implementações concretas)
│   ├── auth/                        # JWT Strategy, Guards, Decorators
│   ├── database/prisma/             # PrismaService e módulo
│   ├── exceptions/                  # Exceções de infraestrutura
│   ├── filters/                     # Exception Filters (Domain, Application, Infrastructure)
│   ├── interceptors/                # DateSerializerInterceptor (ISO 8601 com timezone)
│   ├── mappers/                     # Conversão Prisma → Entidade de domínio
│   ├── repositories/                # Implementações Prisma dos repositórios
│   └── services/                    # BcryptHashService, JwtTokenService
│
├── presentation/                    # Camada de apresentação (controllers, DTOs)
│   ├── auth/                        # AuthController + DTOs
│   ├── user/                        # UserController + DTOs
│   ├── service/                     # ServiceController + DTOs
│   ├── parts-supplies/              # PartsSuppliesController + DTOs
│   ├── customers/                   # CustomersController + DTOs
│   └── vehicles/                    # VehiclesController + DTOs
│
├── config/                          # Configurações (Swagger)
├── app.module.ts
└── main.ts

test/
├── helpers/                         # Factories de mocks reutilizáveis
└── unit/                            # Testes unitários espelhando src/
    ├── domain/entities/
    ├── application/use-cases/
    └── infrastructure/

prisma/
├── schema.prisma                    # Schema do banco de dados
├── prisma.config.ts                 # Configuração do Prisma v7 (DATABASE_URL)
├── migrations/                      # Migrations geradas pelo Prisma
├── seed.ts                          # Entry point do seed
└── seeds/                           # Scripts de seed por entidade
```

### Exceções por Camada

Cada camada possui suas próprias exceções, sem dependência de framework HTTP:

| Camada | Exceção | HTTP (via Filter) |
|---|---|---|
| Domain | `DomainValidationException` | 422 |
| Domain | `EntityNotFoundException` | 404 |
| Domain | `BusinessRuleViolationException` | 409 |
| Application | `ResourceNotFoundException` | 404 |
| Application | `ResourceConflictException` | 409 |
| Application | `UnauthorizedAccessException` | 401 |
| Infrastructure | `AuthenticationFailedException` | 401 |
| Infrastructure | `DatabaseOperationException` | 503 |

O mapeamento para HTTP acontece exclusivamente nos **Exception Filters** da camada de infraestrutura.

## Rodando com Docker (recomendado)

```bash
docker compose up --build
```

Isso sobe o PostgreSQL, executa as migrations, popula o banco e inicia a API em `http://localhost:3000`.

## Setup local

```bash
# Instalar dependências
npm install

# Subir apenas o PostgreSQL
docker compose up postgres -d

# Gerar o Prisma Client
npm run prisma:generate

# Rodar as migrations
npm run prisma:migrate

# Popular o banco com usuários iniciais
npm run prisma:seed

# Iniciar a aplicação
npm run start:dev
```

## Comandos

| Comando | Descrição |
|---|---|
| `npm run start` | Inicia a aplicação |
| `npm run start:dev` | Inicia em modo watch (hot reload) |
| `npm run start:prod` | Inicia em modo produção |
| `npm run build` | Compila o projeto |
| `npm run test` | Roda testes unitários |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:cov` | Testes com cobertura |
| `npm run lint` | Linting com auto-fix |
| `npm run format` | Formata código com Prettier |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Cria/aplica migrations (dev) |
| `npm run prisma:studio` | Abre o Prisma Studio (GUI do banco) |
| `npm run prisma:seed` | Popula o banco com dados iniciais |

## API

Após iniciar a aplicação:

- **Swagger:** `http://localhost:3000/api/docs`
- **Base URL:** `http://localhost:3000/api`

### Endpoints disponíveis

**Auth** (`/api/auth`)
- `POST /register` — Registrar novo usuário
- `POST /login` — Autenticar e obter tokens
- `POST /refresh` — Renovar tokens com refresh token
- `GET /me` — Dados do usuário autenticado *(requer JWT)*

**Users** (`/api/users`) — *requer JWT*
- `POST /` — Criar usuário
- `GET /` — Listar todos
- `GET /:id` — Buscar por ID
- `PUT /:id` — Atualizar dados
- `PATCH /:id` — Alterar status (ativo/inativo)
- `DELETE /:id` — Remover

**Services** (`/api/services`) — *requer JWT*
- `POST /` — Cadastrar serviço
- `GET /` — Listar (paginado, filtro por ativo)
- `GET /:id` — Buscar por ID
- `PUT /:id` — Atualizar
- `PATCH /:id` — Alterar status (ativo/inativo)
- `DELETE /:id` — Remover

**Peças e Insumos** (`/api/parts-supplies`) — *requer JWT*
- `POST /` — Cadastrar peça ou insumo
- `GET /` — Listar estoque (paginado, filtros: name, sku, category, isActive, lowStock)
- `GET /:id` — Buscar por ID
- `PATCH /:id` — Atualizar dados
- `PATCH /:id/stock` — Movimentar estoque (ENTRY / EXIT / ADJUSTMENT)
- `DELETE /:id` — Remover (soft delete)

**Clientes** (`/api/customers`) — *requer JWT (ADMIN ou ATTENDANT)*
- `POST /` — Cadastrar cliente (CPF ou CNPJ formatado)
- `GET /` — Listar clientes (paginado, filtros: name, type, document)
- `GET /:id` — Buscar por ID
- `PUT /:id` — Atualizar dados
- `DELETE /:id` — Remover (impede exclusão se houver veículos vinculados)

**Veículos** (`/api/vehicles`) — *requer JWT (ADMIN ou ATTENDANT)*
- `POST /` — Cadastrar veículo (validação de placa old `ABC-1234` ou Mercosul `ABC1D23`)
- `GET /` — Listar veículos (paginado, filtros: plate, brand, customerId)
- `GET /:id` — Buscar por ID (retorna cliente aninhado)
- `PUT /:id` — Atualizar dados (placa normalizada para maiúsculas)
- `DELETE /:id` — Remover (impede exclusão se houver ordens de serviço vinculadas)

### Formato de resposta

Todas as respostas de sucesso são envoltas em `{ data: ... }`:

```json
{ "data": { "id": "...", "name": "..." } }
```

Erros seguem o padrão NestJS com mensagens em português:

```json
{ "statusCode": 404, "error": "Não Encontrado", "message": "Recurso não encontrado" }
```

## Testes

### Unitários

```bash
npm test
```

53 suites, 303 testes.

### Postman / Newman

Importe os arquivos `oficina-collection.json` e `oficina-environment.json` no Postman e selecione o environment **"Oficina Mecânica — Local"**.

Antes de executar, preencha as variáveis `adminEmail` e `adminPassword` no environment com as credenciais de um dos usuários criados pelo seed.

Execute os grupos nesta ordem: **Auth → Usuários → Serviços → Peças e Insumos → Clientes → Veículos**.

Ou via linha de comando com a aplicação rodando:

```bash
npx newman run oficina-collection.json -e oficina-environment.json
```

109 requests, 186 assertions.

## Variáveis de Ambiente

Veja `.env.example` para todas as variáveis disponíveis.

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/techchallange?schema=public
JWT_SECRET=your-secret-key
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRATION=7d
BCRYPT_SALT_ROUNDS=12
```

## Seed

O seed cria 5 usuários Admin com senha padrão `Tech@2026`:

- Rafael Neves de Oliveira
- Guilherme da Rocha Salvador
- Lucas Almeida da Silva
- Ramoon Lincoln Barros Camacho
- Renan Santana Camacho

> Os e-mails de acesso estão definidos no arquivo `prisma/seeds/`.
