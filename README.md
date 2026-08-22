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
- **Orçamentos** com aprovação/rejeição do cliente por **link assinado enviado por e-mail**
- **Estoque** com reserva automática na aprovação e baixa no início do serviço
- **Autorização por papéis (RBAC)**: `ADMIN`, `MECHANIC`, `ATTENDANT`
- **Autenticação JWT** (access + refresh) com bcrypt
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

Para parar e remover os containers:

```bash
docker compose down
```

> O `Dockerfile` é multi-stage (`node:22-alpine` builder + runtime), executa `prisma generate` no build e roda `prisma migrate deploy && prisma db seed && node dist/src/main` no `CMD` final.

> **Para testar:** faça login em `POST /api/auth/login` com um admin do seed (veja todos os usuários em [Como executar localmente › Seed](docs/local-setup.md#seed)). Para explorar os endpoints, use o **Swagger** em `/api/docs` ou importe a **collection do Postman** (`collections/oficina-collection.json` + `collections/oficina-environment.json`) — passo a passo em [Testes › Postman / Newman](docs/testing.md#postman--newman).

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

## 🌐 Ecossistema de Repositórios

O projeto está dividido em repositórios especializados e desacoplados:

| Repositório | Papel | Tecnologias |
|---|---|---|
| **[oficina-mecanica-app](https://github.com/FIAP-15SOAT/oficina-mecanica-app)** *(este repositório)* | Aplicação NestJS, APIs, Domínio DDD e Manifestos K8s da aplicação | NestJS, TypeScript, Prisma, Jest, Docker |
| **[oficina-mecanica-infra-base](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-base)** | Fundação de rede na AWS (VPC, Subnets públicas/privadas, Gateways) | Terraform, AWS VPC, NAT Gateway, Route Tables |
| **[oficina-mecanica-k8s](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s)** | Cluster EKS, Node Group, ECR e Plataforma Kubernetes (Postgres, Metrics Server) | Terraform, Helm, Amazon EKS 1.35, Amazon ECR, PostgreSQL 16 |

## 📚 Documentação

| Documento | Conteúdo |
|---|---|
| 🏛️ [Arquitetura](docs/architecture.md) | Clean Architecture, DDD, ciclos de vida, UoW, exceções |
| 🔌 [Referência da API](docs/api.md) | Endpoints por domínio, perfis (RBAC), formato de resposta |
| 💻 [Como executar localmente](docs/local-setup.md) | Setup local, MailHog, variáveis de ambiente, seed |
| 🧪 [Testes](docs/testing.md) | Unitários, E2E, Postman/Newman |
| 🔒 [Segurança](docs/security.md) | Mitigações no código e relatórios (ZAP, SonarQube) |
| 🏗️ [Infra · Visão Geral](docs/infra/overview.md) | Arquitetura da infra como sistema: componentes, ownership e fluxos |
| 🌍 [Infra · Terraform](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-base) | Infraestrutura AWS e Kubernetes (IaC nos repositórios dedicados) |
| ☸️ [Infra · Kubernetes](docs/infra/kubernetes.md) | Manifests de aplicação (`k8s/`), probes, HPA e deploy |
| 🔄 [Infra · CI/CD](docs/infra/ci-cd.md) | Workflows de CI, CD, SAST e DAST |
| 📐 [ADRs](docs/adr) | Decisões arquiteturais |
| 🧩 [Modelo C4](docs/c4) | Diagramas de Contexto, Container e Componente |
| 🎨 [Modelagem de Domínio (Miro)](https://miro.com/app/board/uXjVGvVPEOw=/?share_link_id=9196435429) | Domain Storytelling, Event Storming e Dicionário de Linguagem Ubíqua |

## 👥 Autores

- [Guilherme da Rocha Salvador](https://github.com/guilhermesalvador404)
- [Lucas Almeida da Silva](https://github.com/lucas-almeida-silva)
- [Ramoon Lincoln Barros Camacho](https://github.com/ramooncamacho)
- [Renan Santana Camacho](https://github.com/renancamacho)

## 📄 Licença

Projeto acadêmico (FIAP — 15SOAT), para fins educacionais. Sem licença aberta declarada (`UNLICENSED`).
