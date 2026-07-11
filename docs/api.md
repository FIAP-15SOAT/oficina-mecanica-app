# 🔌 Referência da API

> A fonte viva do contrato é o **Swagger** em `http://localhost:3000/api/docs` (spec em `/api/docs-json`). Esta página é o resumo legível dos endpoints.

## Índice

- [Endpoints disponíveis](#endpoints-disponíveis)
- [Formato de resposta](#formato-de-resposta)

Após iniciar a aplicação:

- **Swagger:** `http://localhost:3000/api/docs`
- **Base URL:** `http://localhost:3000/api`

Todas as rotas autenticadas exigem o header `Authorization: Bearer <token>` (access token). Tokens são obtidos em `POST /auth/login` e renovados em `POST /auth/refresh`.

## Endpoints disponíveis

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
| GET | `/` | Listar (paginado; filtros: `number`, `status`, `customerId`, `vehicleId`, `assignedUserId`; ordenação: `sort`). **Por padrão, ordens em `COMPLETED`, `DELIVERED` e `CANCELLED` são omitidas**; use `?status=X` para recuperá-las. | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id` | Buscar por ID (retorna serviços e peças/insumos da OS) | ADMIN, MECHANIC, ATTENDANT |
| PUT | `/:id` | Atualizar OS (apenas em `RECEIVED` / `IN_DIAGNOSIS`; `userId` extraído do JWT) | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:id` | Atualizar status da OS (apenas `IN_DIAGNOSIS`, `CANCELLED`, `DELIVERED`) | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:workOrderId/services/:serviceId` | Atualizar status de um serviço da OS (`IN_PROGRESS` / `COMPLETED`) | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id/status-history` | Histórico de mudanças de status | ADMIN, MECHANIC, ATTENDANT |
| GET | `/:id/quotes` | Listar orçamentos da OS (sem itens) | ADMIN, MECHANIC, ATTENDANT |

> Demais transições (`AWAITING_APPROVAL`, `APPROVED`, `REJECTED`, `IN_PROGRESS`, `COMPLETED`) são derivadas automaticamente dos fluxos de orçamento e dos status de serviço — veja [Ciclo de vida da Ordem de Serviço](./architecture.md#ciclo-de-vida-da-ordem-de-serviço).

> **Ordenação (`sort`)**: critérios no formato `campo:direção` separados por vírgula (ex.: `?sort=status:desc,createdAt:asc`). Campos permitidos: `status` e `createdAt`; direção `asc` ou `desc`. Padrão: `status:desc,createdAt:asc`. Ao ordenar por `status`, usa-se a **prioridade de negócio** da tabela `WorkOrderStatusInfo` (`RECEIVED` → … → `CANCELLED`), não a ordem alfabética.

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
| POST | `/:id/submissions` | Enviar orçamento para aprovação do cliente (envia e-mail com links assinados). Exige a OS já diagnosticada (nunca `RECEIVED` → 409); permite orçamentos concorrentes (vários `SENT` na mesma OS). | ADMIN, MECHANIC, ATTENDANT |
| PATCH | `/:id` | Aprovar (`status=APPROVED`) ou rejeitar (`status=REJECTED` + `reason`) manualmente | ADMIN, ATTENDANT |
| GET | `/:id/decisions` | Aprovar/rejeitar via link de e-mail (token assinado) — `?token=...` (a ação é derivada do payload do token) | Público |

> Itens só podem ser modificados enquanto o orçamento estiver `PENDING`. A aprovação reserva estoque, materializa itens na OS, transiciona a OS para `APPROVED` e rejeita os demais orçamentos pendentes/enviados da mesma OS (propostas concorrentes). A rejeição só leva a OS a `REJECTED` quando não há outro orçamento `SENT`; havendo, a OS permanece `AWAITING_APPROVAL`. As listagens (`GET /quotes` e `GET /work-orders/:id/quotes`) intencionalmente omitem os itens — apenas `GET /quotes/:id` retorna o orçamento com seus itens.

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

## Formato de resposta

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
