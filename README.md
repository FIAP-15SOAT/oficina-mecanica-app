<div align="center">

# 🔧 Oficina Mecânica API

**Sistema Integrado de Atendimento e Execução de Serviços para oficinas mecânicas** — ordens de serviço, clientes, veículos, peças, insumos, serviços, orçamentos e estoque.

![Node](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)

</div>

## 📋 Sobre

API REST para gestão de oficinas mecânicas, construída com **NestJS** e **Clean Architecture + DDD**.

- **Ordens de serviço** com máquina de estados validada no domínio (`RECEIVED` → … → `DELIVERED`)
- **Orçamentos** com aprovação/rejeição do cliente por **link assinado enviado por e-mail**
- **Estoque** com reserva automática na aprovação e baixa (`StockMovement`) no início do serviço
- **Autorização por papéis (RBAC)**: `ADMIN`, `MECHANIC`, `ATTENDANT`
- **Autenticação JWT** (access + refresh) com bcrypt
- **Concorrência otimista** (lock por `version`) em agregados sensíveis

## 🧰 Stack

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
- **Análise de segurança**: OWASP ZAP (DAST) e SonarQube (SAST/qualidade) — relatórios em `reports/`
- **Containerização**: Docker (multi-stage `node:22-alpine`) + Docker Compose
- **Linting**: ESLint 9 + Prettier 3

## ✅ Pré-requisitos

- **Node.js 22+** e **npm** (apenas para o setup local)
- **Docker** + **Docker Compose** (recomendado para subir todos os serviços)
- **Git**

## 🚀 Quick Start

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

> **Para testar:** faça login em `POST /api/auth/login` com um admin do seed. Veja todos os usuários em [Como executar localmente › Seed](docs/local-setup.md#seed).

## ⚙️ Comandos

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

## 🏛️ Arquitetura

**Clean Architecture** com camadas estritas — as dependências apontam só para dentro. `domain/` e `application/` são livres de framework e ORM (uma cerca de ESLint quebra a build se `@nestjs/*` ou o client do Prisma vazarem para lá). Práticas de **DDD**: entidades ricas, value objects e agregados (`WorkOrder`, `Quote`) que protegem invariantes. Os **Clean Controllers** e **Presenters** (POJOs) ficam em `interface-adapters/`; a borda NestJS (rotas, Swagger, guards) vive em `infrastructure/http/` e apenas delega.

➡️ Detalhes completos em **[Arquitetura](docs/architecture.md)**.

## 📚 Documentação

| Documento | Conteúdo |
|---|---|
| 🏛️ [Arquitetura](docs/architecture.md) | Clean Architecture, DDD, ciclos de vida, UoW, exceções |
| 🔌 [Referência da API](docs/api.md) | Endpoints por domínio, perfis (RBAC), formato de resposta |
| 💻 [Como executar localmente](docs/local-setup.md) | Setup local, MailHog, variáveis de ambiente, seed |
| 🧪 [Testes](docs/testing.md) | Unitários, E2E, Postman/Newman |
| 🔒 [Segurança](docs/security.md) | Mitigações no código e relatórios (ZAP, SonarQube) |
| 🌍 [Infra · Terraform](docs/infra/terraform.md) | Infraestrutura AWS e Kubernetes (IaC) |
| ☸️ [Infra · Kubernetes](docs/infra/kubernetes.md) | Manifests, storage, probes, deploy |
| 🔄 [Infra · CI/CD](docs/infra/ci-cd.md) | Workflows de CI, CD, SAST e DAST |
| 📐 [ADRs](docs/adr) | Decisões arquiteturais |
| 🧩 [Modelo C4](docs/c4) | Diagramas de Contexto, Container e Componente |

## 👥 Autores

- [Guilherme da Rocha Salvador](https://github.com/guilhermesalvador404)
- [Lucas Almeida da Silva](https://github.com/lucas-almeida-silva)
- [Rafael Neves de Oliveira](https://github.com/RafaelNevesdeOliveira)
- [Ramoon Lincoln Barros Camacho](https://github.com/ramooncamacho)
- [Renan Santana Camacho](https://github.com/renancamacho)

## 📄 Licença

Projeto acadêmico (FIAP — 15SOAT), para fins educacionais. Sem licença aberta declarada (`UNLICENSED`).
