# 💻 Desenvolvimento

Setup local (API na máquina, infra no Docker), variáveis de ambiente e dados de seed. Para subir tudo em containers com um comando, veja o Quick Start no [README](../README.md).

## Índice

- [Setup local](#setup-local)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Seed](#seed)

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
