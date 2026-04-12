# Oficina Mecânica API

Sistema Integrado de Atendimento e Execução de Serviços para oficinas mecânicas. Gestão de ordens de serviço, clientes, veículos, peças e serviços.

**Tech Challenge — Fase 1 — Grupo 15SOAT**

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: NestJS
- **ORM**: Prisma 6
- **Banco de dados**: PostgreSQL
- **Autenticação**: JWT (access + refresh token) com bcrypt
- **Documentação**: Swagger/OpenAPI
- **Testes**: Jest + ts-jest
- **Linting**: ESLint + Prettier

## Arquitetura

O projeto segue **Clean Architecture** com separação clara de camadas:

```
src/
├── domain/                          # Camada de domínio (regras de negócio puras)
│   ├── entities/                    # Entidades com lógica de domínio rica
│   ├── enums/                       # Enums de negócio (UserRole, WorkOrderStatus, etc.)
│   ├── exceptions/                  # Exceções de domínio (DomainValidationException, etc.)
│   └── interfaces/                  # Contratos (repositórios, serviços)
│
├── application/                     # Camada de aplicação (casos de uso)
│   ├── use-cases/
│   │   ├── auth/                    # Register, Authenticate, RefreshToken, GetCurrentUser
│   │   └── user/                    # CRUD completo de usuários
│   └── exceptions/                  # Exceções de aplicação (ResourceNotFound, Conflict, etc.)
│
├── infrastructure/                  # Camada de infraestrutura (implementações concretas)
│   ├── auth/                        # JWT Strategy, Guards, Decorators
│   ├── database/prisma/             # PrismaService e módulo
│   ├── exceptions/                  # Exceções de infraestrutura
│   ├── filters/                     # Exception Filters (Domain, Application, Infrastructure)
│   ├── repositories/                # Implementações Prisma dos repositórios
│   └── services/                    # BcryptHashService, JwtTokenService
│
├── presentation/                    # Camada de apresentação (controllers, DTOs)
│   ├── auth/                        # AuthController + DTOs
│   ├── user/                        # UserController + DTOs
│   └── exceptions/                  # Exceções de apresentação
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

## Pré-requisitos

- Node.js >= 18
- Docker e Docker Compose (para PostgreSQL)

## Setup

```bash
# Instalar dependências
npm install

# Subir o PostgreSQL
docker compose up -d

# Gerar o Prisma Client
npm run prisma:generate

# Rodar as migrations
npm run prisma:migrate

# Popular o banco com usuários iniciais (5 admins)
npm run prisma:seed
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
| `npm run test:e2e` | Testes end-to-end |
| `npm run lint` | Linting com auto-fix |
| `npm run format` | Formata código com Prettier |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` | Cria/aplica migrations |
| `npm run prisma:studio` | Abre o Prisma Studio (GUI do banco) |
| `npm run prisma:seed` | Popula o banco com dados iniciais |

## API

Após iniciar a aplicação, a documentação Swagger fica disponível em:

```
http://localhost:3000/api/docs
```

### Endpoints disponíveis

**Auth** (`/api/auth`)
- `POST /register` — Registrar novo usuário
- `POST /login` — Autenticar e obter tokens
- `POST /refresh` — Renovar tokens com refresh token
- `GET /me` — Dados do usuário autenticado (requer JWT)

**Users** (`/api/users`) — requer JWT + role Admin
- `POST /` — Criar usuário
- `GET /` — Listar todos
- `GET /:id` — Buscar por ID
- `PATCH /:id` — Atualizar
- `PATCH /:id/activate` — Ativar
- `PATCH /:id/deactivate` — Desativar
- `DELETE /:id` — Remover

## Variáveis de Ambiente

```env
DATABASE_URL=postgresql://user:password@localhost:5432/oficina
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
