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

Projeto acadêmico da pós-graduação em Arquitetura de Software da FIAP (turma 15SOAT), **evoluído ao longo de 5 fases**. Cada fase parte de um novo cenário de negócio e adiciona uma camada de maturidade, do MVP de domínio à infraestrutura escalável.

Trata-se de uma API REST para gestão de oficinas mecânicas, construída com **NestJS** e **Clean Architecture + DDD**.
Substitui o controle manual (anotações e planilhas) de uma oficina de médio porte por um **Sistema Integrado de Atendimento e Execução de Serviços** — do recebimento do veículo à entrega, com orçamento, aprovação do cliente, execução e baixa de estoque orquestrados pelo domínio, contemplando:

- **Ordens de serviço** com máquina de estados validada no domínio
- **Orçamentos** com aprovação/rejeição pelo **Cliente da Oficina autenticado** (ver [Autenticação](#-autenticação))
- **Estoque** com reserva automática na aprovação e baixa no início do serviço
- **Autorização por papéis (RBAC)**: `ADMIN`, `MECHANIC`, `ATTENDANT`
- **Dois fluxos de autenticação JWT isolados**: interno (HS256, access + refresh, bcrypt) e externo por CPF + senha (RS256, emitido por uma função serverless dedicada)
- **Concorrência otimista** (lock por `version`) em agregados sensíveis

<details>
<summary><strong>Fase 1 — MVP: Gestão de Ordens de Serviço com DDD</strong></summary>

**Problema:** Uma oficina de médio porte conduzia o atendimento, o diagnóstico, a execução e a entrega dos veículos de forma desorganizada, apoiada em anotações manuais e planilhas — o que gerava erros na priorização dos atendimentos, falhas no controle de peças e insumos, dificuldade em acompanhar o status dos serviços, perda de histórico de clientes e veículos e ineficiência no fluxo de orçamentos e autorizações.

**Objetivo:** Entregar a primeira versão (MVP) do back-end do Sistema Integrado de Atendimento e Execução de Serviços.

**Proposta:** Construir o back-end com foco em gestão de ordens de serviço, clientes e peças, aplicando Domain-Driven Design (DDD) e boas práticas de qualidade de software e segurança.

**Requisitos:**

- Back-end monolítico em arquitetura em camadas;
- APIs RESTful documentadas via Swagger;
- Banco de dados à escolha, com justificativa (ver [ADR 0001](docs/adr/0001-uso-do-postgresql-como-banco-de-dados.md));
- `Dockerfile` e `docker-compose.yml` orquestrando o ambiente completo;
- Testes automatizados com cobertura mínima de 80% nos domínios críticos;
- Autenticação JWT e validação de dados sensíveis (CPF/CNPJ, placa).

🎥 **Demonstração:** [vídeo da Fase 1 (Google Drive)](https://drive.google.com/file/d/10DaHvGB_qMzGzi8Qty3tGAaExQTSPQ1h/view?usp=sharing)

</details>

### Fase 2 — Qualidade, Resiliência e Escalabilidade · fase atual

**Problema:** Com o sucesso do MVP vieram o aumento da demanda, a expansão para novas unidades e a necessidade de garantir alta disponibilidade. A oficina precisa reduzir riscos operacionais, automatizar o provisionamento e o deploy do ambiente e sustentar grandes volumes de ordens de serviço em horários de pico, com escalabilidade dinâmica.

**Objetivo:** Evoluir a aplicação da Fase 1 para garantir qualidade, resiliência e escalabilidade, incorporando práticas modernas de infraestrutura e automação.

**Proposta:** Refatorar o código sob Clean Code e Clean Architecture e sustentar a aplicação com containerização, orquestração em Kubernetes, infraestrutura como código e uma pipeline de CI/CD.

**Requisitos:**

- Refatoração com Clean Code e Clean Architecture, com testes automatizados cobrindo os fluxos críticos;
- APIs de abertura de OS, consulta de status, aprovação de orçamento por notificação externa, listagem ordenada por status (excluindo logicamente as finalizadas e entregues) e atualização de status por e-mail;
- Containerização com Docker e `docker-compose` para desenvolvimento local;
- Orquestração em Kubernetes: Deployments, Services, ConfigMaps e Secrets, e Horizontal Pod Autoscaler (HPA);
- Infraestrutura como Código (IaC) com Terraform, provisionando o cluster Kubernetes e o banco de dados;
- Pipeline de CI/CD: build, testes, imagem Docker, deploy no cluster e aplicação dos manifestos.

🎥 **Demonstração:** [vídeo da Fase 2 (YouTube)](https://youtu.be/9s8oesicepc)

## 🧰 Stack

- **Runtime**: Node.js 22 + TypeScript 5
- **Framework**: NestJS 11
- **ORM**: Prisma 7 (driver `@prisma/adapter-pg`, client gerado em `prisma/generated/`)
- **Banco de dados**: PostgreSQL 16
- **Autenticação**: dois fluxos JWT isolados via `passport-jwt` — interno (HS256, access + refresh token, bcrypt) e externo por CPF + senha (RS256, emitido por uma função serverless dedicada) — ver [Autenticação](#-autenticação)
- **E-mail**: Nodemailer + `@nestjs-modules/mailer` (SMTP via MailHog em desenvolvimento)
- **Segurança HTTP**: Helmet, CORS configurável via `ALLOWED_ORIGINS`, `SanitizeStringsPipe` global, `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`)
- **Observabilidade**: logs estruturados em JSON no stdout com `pino` + `nestjs-pino` (nomenclatura OpenTelemetry, correlação por `request.id`, redação de dados sensíveis) — ver [ADR 0002](docs/adr/0002-logging-estruturado.md)
- **Telemetria**: traces e métricas de negócio pelo SDK do OpenTelemetry, correlacionados ao log por `trace_id`, sem nenhuma dependência ou credencial de fornecedor na aplicação; desligada por padrão (endpoint vazio) — ver [ADR 0005](docs/adr/0005-opentelemetry.md)
- **Health checks**: endpoints dedicados de vivacidade (`/api/health/live`) e prontidão (`/api/health/ready`), consumidos pelas três probes do Kubernetes, com encerramento gracioso — ver [ADR 0003](docs/adr/0003-health-checks.md)
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
git clone https://github.com/FIAP-15SOAT/oficina-mecanica-app.git
cd oficina-mecanica-app/app

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

Para conferir que a aplicação subiu e alcança o banco:

```bash
curl -i http://localhost:3000/api/health/live   # 200 {"status":"ok"} — o processo responde
curl -i http://localhost:3000/api/health/ready  # 200 {"status":"ok"} — e o banco está acessível
```

Para parar e remover os containers:

```bash
docker compose down
```

> O `Dockerfile` é multi-stage (`node:22-alpine` builder + runtime), executa `prisma generate` no build e tem `CMD ["node", "--require", "./dist/src/otel.js", "dist/src/main"]` — **só a aplicação**. O `--require` carrega o preload do OpenTelemetry **antes** de `express` e `pg` serem importados, que é a única ordem em que a instrumentação consegue aplicar o patch; sem `OTEL_EXPORTER_OTLP_ENDPOINT` ele retorna cedo e não carrega nada (ver [ADR 0005](docs/adr/0005-opentelemetry.md)). A migração e o seed rodam num passo próprio: o serviço `migrate` do Compose localmente, e o Job `k8s/00-db-migrate-job.yaml` no CD.

> **Para testar:** faça login em `POST /api/auth/login` com um admin do seed (veja todos os usuários em [Como executar localmente › Seed](docs/local-setup.md#seed)). Para explorar os endpoints, use o **Swagger** em `/api/docs` ou importe a **collection do Postman** (`collections/oficina-collection.json` + `collections/oficina-environment.json`) — passo a passo em [Testes › Postman / Newman](docs/testing.md#postman--newman).

## ⚙️ Comandos

Execute todos os comandos a partir de `app/` (`cd app`) — não há `package.json` na raiz do repositório.

| Comando | Descrição |
|---|---|
| `npm run start` | Inicia a aplicação |
| `npm run start:dev` | Inicia em modo watch (hot reload) |
| `npm run start:prod` | Inicia em modo produção (`node --require ./dist/src/otel.js dist/src/main` — mesmo preload de telemetria do `CMD` da imagem) |
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

## 🔐 Autenticação

Dois fluxos de autenticação **totalmente isolados** — nunca um único verificador aceitando os dois algoritmos (isso eliminaria, por construção, a classe de ataque de confusão de algoritmo):

| | Interno (funcionários) | Externo (Cliente da Oficina) |
|---|---|---|
| Quem | `ADMIN`, `MECHANIC`, `ATTENDANT` | Pessoa física dona do veículo, ou representante autorizado de uma empresa cliente |
| Como autentica | `POST /api/auth/login` (e-mail + senha) nesta própria API | CPF + senha, verificados por uma **função serverless dedicada** que consulta o banco diretamente — nunca um proxy do login interno |
| Algoritmo / chave | JWT **HS256**, `JWT_SECRET` (simétrica) | JWT **RS256** assimétrico — esta API só guarda a chave **pública** (`CUSTOMER_JWT_PUBLIC_KEY`); a privada vive na função serverless |
| Estratégia Passport | `jwt` (`JwtStrategy`) | `customer-jwt` (`CustomerJwtStrategy`) |
| Guard HTTP | `JwtAuthGuard` (+ `RolesGuard` por papel) | `CustomerJwtAuthGuard` (`AnyAuthGuard` aceita os dois em `GET /api/me` e `PATCH /api/me/password`) |
| O que o token carrega | `sub` (userId) + `role` | Só `sub` (userId) — **nunca** `customerId`. Autorização é resolvida por vínculo (`UserCustomer`) a cada requisição, então revogar acesso ou desativar o cliente vale imediatamente, sem lista de revogação de token |
| Superfície de rotas | Todas as rotas internas por perfil (ver matriz abaixo) | `/api/me/*` |

A função serverless de autenticação externa **não está neste repositório** — vive em [`oficina-mecanica-lambda-customer-auth`](https://github.com/FIAP-15SOAT/oficina-mecanica-lambda-customer-auth). Ver [ADR 0004](docs/adr/0004-autenticacao-de-clientes.md) para o raciocínio completo por trás dessas decisões, e [docs/local-setup.md](docs/local-setup.md#variáveis-de-ambiente) para rodar os dois repositórios juntos localmente.

<details>
<summary><strong>Matriz completa de rotas e permissões</strong></summary>

| Rota | Guard(s) | Acesso |
|---|---|---|
| `POST /api/auth/login` | — | Público |
| `POST /api/auth/refresh` | — | Público |
| `POST /api/auth/password-reset-confirmations` | `@Public()` | Público (exige e-mail + código numérico válidos) |
| `GET /api/me` | `AnyAuthGuard` | JWT interno OU `customer-jwt` |
| `PATCH /api/me/password` | `AnyAuthGuard` | JWT interno OU `customer-jwt` |
| `GET /api/me/work-orders` | `CustomerJwtAuthGuard` | `customer-jwt` |
| `GET /api/me/work-orders/:workOrderId` | `CustomerJwtAuthGuard` | `customer-jwt` |
| `GET /api/me/work-orders/:workOrderId/quotes` | `CustomerJwtAuthGuard` | `customer-jwt` |
| `GET /api/me/quotes/:quoteId` | `CustomerJwtAuthGuard` | `customer-jwt` |
| `POST /api/me/quotes/:quoteId/decisions` | `CustomerJwtAuthGuard` | `customer-jwt` |
| `POST /api/users` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `GET /api/users` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `GET /api/users/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `PUT /api/users/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `PATCH /api/users/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `DELETE /api/users/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `POST /api/users/:userId/password-resets` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `GET /api/users/:userId/customers` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `POST /api/customers` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `GET /api/customers` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `GET /api/customers/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `GET /api/customers/:id/vehicles` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `PUT /api/customers/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `DELETE /api/customers/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `POST /api/customers/:customerId/users` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `GET /api/customers/:customerId/users` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `DELETE /api/customers/:customerId/users/:userId` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `PATCH /api/customers/:customerId` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `POST /api/vehicles` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `GET /api/vehicles` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `GET /api/vehicles/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `PUT /api/vehicles/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `DELETE /api/vehicles/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `POST /api/services` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `GET /api/services` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `GET /api/services/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `GET /api/services/:id/metrics` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `PUT /api/services/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `DELETE /api/services/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `GET /api/services-metrics` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `POST /api/parts-supplies` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `GET /api/parts-supplies` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `GET /api/parts-supplies/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `PUT /api/parts-supplies/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `PATCH /api/parts-supplies/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `DELETE /api/parts-supplies/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN` |
| `POST /api/work-orders` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `GET /api/work-orders` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `GET /api/work-orders/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `PUT /api/work-orders/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `PATCH /api/work-orders/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `PATCH /api/work-orders/:workOrderId/services/:serviceId` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `GET /api/work-orders/:id/status-history` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `GET /api/work-orders/:id/quotes` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `GET /api/quotes` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `POST /api/quotes` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `GET /api/quotes/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `POST /api/quotes/:id/services` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `PATCH /api/quotes/:id/services/:serviceId` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `DELETE /api/quotes/:id/services/:serviceId` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `POST /api/quotes/:id/parts-supplies` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `PATCH /api/quotes/:id/parts-supplies/:partSupplyId` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `DELETE /api/quotes/:id/parts-supplies/:partSupplyId` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `POST /api/quotes/:id/submissions` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `MECHANIC`, `ATTENDANT` |
| `PATCH /api/quotes/:id` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `GET /api/stock-movements` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |
| `GET /api/stock-reservations` | `JwtAuthGuard`, `RolesGuard` | `ADMIN`, `ATTENDANT` |

> `GET /api/quotes/:id/decisions?token=...` (decisão pública por link assinado) foi **removido** — substituído por `POST /api/me/quotes/:quoteId/decisions`, autenticado.

</details>

## 🌐 Ecossistema de Repositórios

O projeto está dividido em repositórios especializados e desacoplados:

| Repositório | Papel | Tecnologias |
|---|---|---|
| **[oficina-mecanica-app](https://github.com/FIAP-15SOAT/oficina-mecanica-app)** *(este repositório)* | Aplicação NestJS, APIs, Domínio DDD e Manifestos K8s da aplicação | NestJS, TypeScript, Prisma, Jest, Docker |
| **[oficina-mecanica-infra-base](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-base)** | Fundação de rede na AWS (VPC, Subnets públicas/privadas, Gateways) | Terraform, AWS VPC, NAT Gateway, Route Tables |
| **[oficina-mecanica-k8s](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s)** | Cluster EKS, Node Group, ECR e Plataforma Kubernetes (Metrics Server) | Terraform, Helm, Amazon EKS 1.35, Amazon ECR |
| **[oficina-mecanica-database](https://github.com/FIAP-15SOAT/oficina-mecanica-database)** | Banco de dados relacional gerenciado, **fora do cluster** | Terraform, Amazon RDS, PostgreSQL 16 |

## 📚 Documentação

| Documento | Conteúdo |
|---|---|
| 🏛️ [Arquitetura](docs/architecture.md) | Clean Architecture, DDD, ciclos de vida, UoW, exceções, logs estruturados |
| 🔌 [Referência da API](docs/api.md) | Endpoints por domínio, perfis (RBAC), formato de resposta |
| 💻 [Como executar localmente](docs/local-setup.md) | Setup local, MailHog, variáveis de ambiente, seed |
| 🧪 [Testes](docs/testing.md) | Unitários, E2E, Postman/Newman |
| 🔒 [Segurança](docs/security.md) | Mitigações no código, proteção de dados nos logs e relatórios (ZAP, SonarQube) |
| 🏗️ [Infra · Visão Geral](docs/infra/overview.md) | Arquitetura da infra como sistema: componentes, ownership e fluxos |
| 🌍 [Infra · Terraform](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-base) | Infraestrutura AWS e Kubernetes (IaC nos repositórios dedicados) |
| ☸️ [Infra · Kubernetes](docs/infra/kubernetes.md) | Manifests de aplicação (`k8s/`), probes, HPA e deploy |
| 🔄 [Infra · CI/CD](docs/infra/ci-cd.md) | Workflows de CI, CD, SAST e DAST |
| 📐 [ADRs](docs/adr) | Decisões arquiteturais — [0001 PostgreSQL](docs/adr/0001-uso-do-postgresql-como-banco-de-dados.md), [0002 Logging estruturado](docs/adr/0002-logging-estruturado.md), [0003 Health checks](docs/adr/0003-health-checks.md), [0004 Autenticação de clientes](docs/adr/0004-autenticacao-de-clientes.md), [0005 OpenTelemetry](docs/adr/0005-opentelemetry.md), [0006 Escolha de nuvem](docs/adr/0006-escolha-de-nuvem-aws.md), [0007 Padrão de comunicação](docs/adr/0007-padrao-de-comunicacao-rest-monolito.md), [0008 Autoscaling (HPA)](docs/adr/0008-autoscaling-via-hpa.md), [0009 Clean Architecture/DDD](docs/adr/0009-clean-architecture-ddd-em-camadas.md), [0010 Concorrência otimista](docs/adr/0010-concorrencia-otimista-via-version.md), [0011 Unit of Work](docs/adr/0011-unit-of-work-transacoes-multi-repositorio.md), [0012 Exceções por camada](docs/adr/0012-hierarquia-de-excecoes-por-camada.md), [0013 Autenticação interna JWT](docs/adr/0013-autenticacao-interna-jwt-stateless.md), [0014 Pipelines CI/CD/SAST/DAST](docs/adr/0014-pipelines-ci-cd-sast-dast-separados.md) |
| 🧩 [Modelo C4](docs/c4) | Diagramas de Contexto, Container e Componente |
| 🎨 [Modelagem de Domínio (Miro)](https://miro.com/app/board/uXjVGvVPEOw=/?share_link_id=9196435429) | Domain Storytelling, Event Storming e Dicionário de Linguagem Ubíqua |

## 👥 Autores

- [Guilherme da Rocha Salvador](https://github.com/guilhermesalvador404)
- [Lucas Almeida da Silva](https://github.com/lucas-almeida-silva)
- [Ramoon Lincoln Barros Camacho](https://github.com/ramooncamacho)
- [Renan Santana Camacho](https://github.com/renancamacho)

## 📄 Licença

Projeto acadêmico (FIAP — 15SOAT), para fins educacionais. Sem licença aberta declarada (`UNLICENSED`).
