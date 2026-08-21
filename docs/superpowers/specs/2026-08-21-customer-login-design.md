# Design: Login do Cliente e Unificação da Troca de Senha

**Data:** 2026-08-21
**Escopo:** Autenticação própria para `Customer`, ciclo de vida de senha (criação, troca, reset) unificado entre `User` e `Customer`, e decisão de orçamento por cliente autenticado. O fluxo existente de aprovação por link assinado por e-mail **não é alterado**.

---

## Problema

Hoje `Customer` não tem nenhum mecanismo de autenticação — só interage com o sistema aprovando/rejeitando orçamento via link assinado por e-mail (`GET /quotes/:id/decisions?token=...`, endpoint `@Public()`, sem sessão, sem senha).

Ao revisar a feature de documento (CPF/CNPJ) no `User` (branch `feat/user-document-login`), surgiu a discussão de dar login ao cliente. Duas propostas foram consideradas (ver `docs/adr/0003-...`):
- **A** — `Customer` ganha login próprio, independente de `User`.
- **B** — `User` ganha uma FK opcional para `Customer` (login de "operador" de empresa).

Decisão: **A**. `User` (equipe da oficina: ADMIN/MECHANIC/ATTENDANT) e `Customer` (cliente da oficina, PF ou PJ) continuam sendo dois módulos e dois domínios de autenticação separados — consistente com o que já está documentado no C4 e em `docs/architecture.md`.

Discutindo a implementação, surgiram mais dois problemas relacionados, tratados juntos nesta spec:
1. **Como o cliente define a senha**, já que não há front-end de autocadastro.
2. **A troca de senha de `User` hoje está misturada** no `PATCH/PUT` geral de atualização de usuário (junto com nome, e-mail, role) — um endpoint dedicado, com regra clara de quem pode trocar a senha de quem, resolve isso e também cobre o caso do cliente de forma genérica.

## Escopo do que o cliente logado pode fazer

Só o que ele já faz hoje (aprovar/rejeitar orçamento), agora autenticado — mais uma listagem dos próprios orçamentos pendentes, para não depender só do link do e-mail para saber o que decidir. Nenhuma outra tela/endpoint de "portal do cliente" (ver veículos, OS, histórico) está no escopo.

## Solução

### 1. `Customer` ganha autenticação própria

```prisma
model Customer {
  ...
  passwordHash String @map("password_hash") @db.VarChar(255)
  ...
}
```

Obrigatório desde já (`NOT NULL`), mesmo padrão adotado para `document` no `User`: projeto não está em produção, aplica-se a todos os clientes já cadastrados via reset+reseed local.

`Customer` entity ganha `passwordHash: string` (igual ao `User`), reaproveitando `PASSWORD_REGEX`/`validatePasswordStrength` já existentes no domínio de `User` (extraídos para um local compartilhado, já que a regra de força de senha não é específica de nenhum dos dois — mesmo raciocínio já aplicado ao generalizar `Document`/`PersonType`).

### 2. Endpoint de login próprio do cliente

`POST /auth/customer/login` — endpoint **separado** de `POST /auth/login` (que continua servindo só `User`). Body: `{ identifier, password }`, mesma lógica de roteamento por formato já usada no login de `User` (`identifier` contém `@` → busca por e-mail; senão, sanitiza e busca por documento) — só que contra `ICustomerRepository` (que ganha `findByEmail`/`findByDocument` se ainda não existirem).

**Token e guard separados do domínio de `User`:**
- Novos secrets `CUSTOMER_JWT_SECRET` / `CUSTOMER_JWT_REFRESH_SECRET` (mesmo padrão do `QUOTE_DECISION_TOKEN_SECRET`, que já é um secret dedicado separado do `JWT_SECRET` de staff).
- Reaproveita os métodos **genéricos** já existentes em `ITokenService` (`signWithSecret`/`verifyWithSecret`) — os mesmos usados hoje pelo token de decisão de orçamento por e-mail — em vez de criar uma nova interface de serviço de token. Payload: `{ sub: customerId, email, type: 'customer' }` (sem `role` — cliente não tem papel de RBAC de staff).
- `JwtCustomerStrategy` (nova, Passport strategy nomeada `'jwt-customer'`, análoga a `JwtStrategy` mas configurada com `CUSTOMER_JWT_SECRET` e revalidando contra `ICustomerRepository.findById`) + `JwtCustomerAuthGuard` (análogo a `JwtAuthGuard`, usa `AuthGuard('jwt-customer')`).
- `POST /auth/customer/refresh` — espelha `POST /auth/refresh`, usando o par de secrets do cliente.
- `GET /auth/customer/me` — espelha `GET /auth/me`.

Duas estratégias nomeadas distintas (`'jwt'` para staff, `'jwt-customer'` para cliente) evitam qualquer ambiguidade: um token de cliente nunca é aceito por um endpoint de staff e vice-versa, mesmo que por acidente algum guard fosse aplicado no lugar errado — a estratégia erra ao tentar resolver o `sub` na tabela errada.

### 3. Ciclo de vida de senha — unificado entre `User` e `Customer`

**Criação:** `POST /customers` deixa de aceitar (e nunca aceitou) um campo de senha do cliente. `CreateCustomerUseCase` passa a:
1. Gerar uma senha aleatória forte (nova função utilitária, ex. `generateSecurePassword()` — sem depender de nenhuma lib nova, usando `crypto.randomBytes` já disponível no Node, garantindo que o resultado satisfaça `PASSWORD_REGEX`).
2. Fazer o hash via `IHashService` (já injetado/injetável, mesmo serviço do `User`).
3. Chamar `Customer.create(...)` com o hash.
4. Enviar e-mail ao cliente com a senha em texto puro, via `IEmailSenderService` (mesma porta já usada para o e-mail de orçamento) — a senha nunca é retornada pela API, só pelo e-mail.

**Endpoint dedicado de troca de senha — dividido em duas rotas por agregado, não uma só.** A ideia original (uma única rota `PATCH /:id/password`, decidindo self-vs-admin comparando `:id` com o `sub` do token) não funciona bem para `Customer`: "eu mesmo trocando" usa o `JwtCustomerAuthGuard` (token de cliente), enquanto "admin/atendente trocando de outra pessoa" usa o `JwtAuthGuard` de staff — são dois domínios de guard diferentes, e uma única rota não aceita os dois ao mesmo tempo sem um guard composto. Solução mais simples e mais RESTful: separar em rota `/me/` (self, um guard só) e rota `/:id/` (admin, o outro guard):

| Rota | Guard | Body | Efeito |
|---|---|---|---|
| `PATCH /users/me/password` | `JwtAuthGuard` (qualquer role — todo funcionário troca a própria senha) | `{ currentPassword, newPassword }` | Confere `currentPassword` via `IHashService.compare`; se bater, troca para `newPassword` (validado por `PASSWORD_REGEX`). **Sem e-mail.** |
| `PATCH /users/:id/password` | `JwtAuthGuard` + `@Roles(ADMIN)` | (vazio) | Gera uma senha nova aleatória (mesma função da criação), salva o hash, **envia e-mail ao dono da conta** avisando que a senha foi alterada por outra pessoa, com a senha nova. |
| `PATCH /customers/me/password` | `JwtCustomerAuthGuard` | `{ currentPassword, newPassword }` | Igual à de `User`, mas contra `ICustomerRepository`. |
| `PATCH /customers/:id/password` | `JwtAuthGuard` + `@Roles(ADMIN, ATTENDANT)` | (vazio) | Igual à de `User`, mas contra `ICustomerRepository` — mesmos papéis que já gerenciam clientes hoje. |

Essa divisão cobre o cliente automaticamente sem nenhum `if` especial: como não existe front-end de autocadastro, toda troca de senha de cliente **é sempre** feita por outra pessoa (atendente/admin) — sempre passa pela rota `/:id/password`, que já dispara o e-mail. A rota `/me/password` do cliente só entra em uso no dia em que existir algum front-end de self-service.

`password` é removido do `PATCH/PUT` geral de atualização de `User` (hoje em `UpdateUserDto`/`UpdateUserRequestDto`) — a troca de senha passa a existir só no endpoint dedicado.

### 4. Orçamento para cliente autenticado

O link assinado por e-mail (`GET /quotes/:id/decisions?token=...`, `@Public()`) **continua existindo, sem nenhuma alteração** — é o fallback que já funciona sem login.

Novos endpoints, protegidos por `JwtCustomerAuthGuard`:
- `GET /quotes/me` — lista os orçamentos com status `SENT` cujo `WorkOrder.customerId` é o do cliente logado (só os dados necessários para decidir: id, itens, valores, número da OS). Atenção na implementação: essa rota literal precisa ser registrada **antes** de `GET /quotes/:id` no controller, senão o Nest tenta casar `"me"` como valor de `:id`.
- `PATCH /quotes/:id/decisions` — body `{ action: 'APPROVE' | 'REJECT', reason?: string }`. Novo caso de uso (`AuthenticatedQuoteDecisionUseCase`, modelado diretamente sobre o `EmailDecisionQuoteUseCase` existente): busca o `Quote`, busca a `WorkOrder` associada, verifica que `workOrder.customerId === customer.id` (senão, `403` — nunca `404`, para não revelar a um cliente que um orçamento de outro cliente existe), e delega para `ApproveQuoteUseCase`/`RejectQuoteUseCase` exatamente como o fluxo por link já faz hoje (sem passar `userId`, mesma assinatura que o fluxo de e-mail já usa hoje sem estar autenticado).

### 5. Documentação

`docs/c4/README.md` (tabela de módulos do diagrama de Componente): o módulo "Usuários" estava descrito como "CRUD de usuários e mecânicos (perfis ADMIN, MECHANIC, ATTENDANT)" — redundante, já que `MECHANIC` é um dos perfis listados a seguir. Ajustado para "CRUD de usuários" (mecânico é só um tipo de usuário, igual admin e atendente). Ajuste de texto, sem relação com a decisão de arquitetura — aproveitado porque veio à tona na mesma discussão. **Já aplicado** nesta spec (não é mais um item pendente do plano de implementação).

## Arquivos alterados (visão geral)

| Camada | Arquivo | Mudança |
|---|---|---|
| Domain | `entities/customer.entity.ts` | campo `passwordHash`, `validatePasswordStrength` compartilhado |
| Domain | `constants/regex/password.regex.ts` (ou equivalente) | deixa de ser específico de `User`, se ainda não for compartilhado |
| Domain | `interfaces/repositories/customer.repository.interface.ts` | `findByEmail`, `findByDocument` (se não existirem) |
| Application | `use-cases/customer/create-customer.use-case.ts` | gera senha, envia e-mail |
| Application | `use-cases/auth/authenticate-customer.use-case.ts` | novo — login do cliente |
| Application | `use-cases/auth/*` | refresh/me equivalentes para cliente |
| Application | `use-cases/user/change-user-password.use-case.ts` | novo — substitui troca de senha do `PATCH/PUT` geral |
| Application | `use-cases/customer/change-customer-password.use-case.ts` | novo |
| Application | `use-cases/quote/authenticated-quote-decision.use-case.ts` | novo |
| Application | `use-cases/quote/find-pending-quotes-for-customer.use-case.ts` | novo |
| Infrastructure | `http/strategies/jwt-customer.strategy.ts` | novo |
| Infrastructure | `http/guards/jwt-customer-auth.guard.ts` | novo |
| Infrastructure | `http/controllers/auth/*` (customer) | novos endpoints |
| Infrastructure | `http/controllers/user/dto/requests/update-user-request.dto.ts` | remove `password` |
| Infrastructure | `persistence/prisma/*` | migration, mapper, repositório |
| Database | `prisma/schema.prisma` + migration | `password_hash` em `customers` |

## O que não muda

- Fluxo de link assinado por e-mail para aprovação de orçamento — inalterado, continua funcionando exatamente como hoje.
- RBAC de `User` (ADMIN/MECHANIC/ATTENDANT) — inalterado.
- `Document`/`PersonType` (feature anterior) — inalterados, esta feature só consome o que já existe.
- Nenhuma unicidade cruzada entre login de `User` e de `Customer` — continuam sendo tabelas e domínios de autenticação independentes.

## Não-escopo explícito

- Portal do cliente com visualização de veículos/OS/histórico — fora de escopo, só orçamento.
- Conceito de "operador" (uma pessoa PF logando em nome de um `Customer` PJ) — deliberadamente fora de escopo agora; pode ser modelado depois como uma relação própria, sem acoplar a `User`.
- Autocadastro do cliente com definição de senha via link — não há front-end para isso; a senha inicial é sempre gerada pelo sistema e entregue por e-mail.
