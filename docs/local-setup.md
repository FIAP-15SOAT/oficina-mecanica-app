# 💻 Como executar localmente

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

Para executar chamadas à API, use o Swagger em `/api/docs` ou importe a collection e o environment do Postman (`collections/oficina-collection.json` e `collections/oficina-environment.json`) — o passo a passo está em [Testes › Postman / Newman](testing.md#postman--newman).

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

# Observabilidade — todas opcionais; nenhuma variável ausente ou inválida impede o boot
# Níveis aceitos: fatal | error | warn | info | debug | trace | silent (default: info)
LOG_LEVEL=info
OTEL_SERVICE_NAME=oficina-mecanica-api
OTEL_SERVICE_NAMESPACE=oficina-mecanica
# Lista separada por vírgula (ex.: 10.0.0.0/8,loopback). Ausente ou inválida =
# nenhum proxy confiável e cabeçalhos X-Forwarded-For ignorados (falha fechada).
# TRUSTED_PROXY_CIDRS=
```

`SERVICE_VERSION` **não** é configurada por env em desenvolvimento: ela é assada na imagem (`ARG SERVICE_VERSION` no `Dockerfile`, alimentado pelo `github.sha` no `cd.yml`) e cai para `dev` fora do contêiner. `deployment.environment.name` reaproveita o `NODE_ENV` já existente — não há variável nova para ambiente.

> **Atenção**: em produção, gere segredos fortes para `JWT_SECRET`, `JWT_REFRESH_SECRET` e `QUOTE_DECISION_TOKEN_SECRET`. Os valores padrão do `docker-compose.yml` são apenas placeholders.

### Logs legíveis em desenvolvimento

O processo **sempre** emite JSON em stdout — o formato nunca varia por ambiente (ver [ADR 0002](./adr/0002-logging-estruturado.md)). A saída legível vem de um pipe já embutido no `start:dev`:

```
"start:dev": "nest start --watch | pino-pretty --timestampKey timestamp --messageKey message"
```

As duas flags são **obrigatórias**: o envelope renomeia `time` → `timestamp` e `msg` → `message`, então um pipe sem elas não renderiza nem o horário nem a mensagem. (`pino-pretty` já lida com rótulos textuais de nível, então `level` não precisa de flag.) `pino-pretty` é `devDependency` e **nunca** deve ser importado de `src/` nem declarado como `transport` no código.

Para silenciar completamente a saída em uma execução local, use `LOG_LEVEL=silent`.

## Seed

O seed cria 4 usuários Admin com senha padrão `Tech@2026`:

| Nome | E-mail | Senha |
|------|--------|-------|
| Guilherme da Rocha Salvador | `guilhermedarochasalvador@gmail.com` | `Tech@2026` |
| Lucas Almeida da Silva | `lucas.almeida-silva@hotmail.com` | `Tech@2026` |
| Ramoon Lincoln Barros Camacho | `ramooncamacho@hotmail.com` | `Tech@2026` |
| Renan Santana Camacho | `camacho.renan@gmail.com` | `Tech@2026` |

Use qualquer um desses e-mails com a senha `Tech@2026` no endpoint `POST /api/auth/login` para autenticar e obter o token JWT.

Os scripts de seed em `prisma/seeds/` são executados em ordem pelo entrypoint `prisma/seed.ts`: `work-order-status-info.seed.ts` (tabela de referência de prioridade dos status de OS), depois `user.seed.ts`, `part-supply.seed.ts`, `service.seed.ts`, `customer.seed.ts`, `vehicle.seed.ts` e `work-order.seed.ts`. Eles populam dados de referência para acelerar o onboarding e os testes manuais. Todos são idempotentes (`upsert`), então podem rodar a cada deploy sem duplicar registros.
