# Acesso do cliente via `User` + `UserCustomerAccess` — Design

## Contexto

A feature anterior (`docs/superpowers/specs/2026-08-21-customer-login-design.md`, ADR `0003-customer-com-autenticacao-propria-separada-de-user.md`) deu a `Customer` seu próprio `passwordHash` e um domínio de autenticação inteiramente separado do de `User` (guard, estratégia JWT, secrets, endpoints e casos de uso próprios).

Na revisão da PR (#57), um colega da equipe (Lucas) questionou essa decisão de forma consistente em ~24 comentários: para ele, a única diferença entre um cliente logado e qualquer outro usuário é a *role* — o cliente não deixa de ser um usuário, assim como mecânico, admin e atendente já são. Ele trouxe três sessões de IA (ChatGPT, Claude, Gemini) que convergiram numa proposta parecida; a do ChatGPT foi adotada como base desta spec.

Este documento substitui a decisão do ADR 0003 (que será marcado como superseded) pela arquitetura descrita abaixo.

## Decisão

- `User` passa a ser a única identidade autenticável do sistema. Ganha o valor `CUSTOMER` no enum `UserRole` (ADMIN, MECHANIC, ATTENDANT, CUSTOMER). O campo `document` que `User` já tem (desde a feature de CPF/CNPJ no login) é reaproveitado como identificador da pessoa — nenhum campo novo de documento é criado em `User`.
- `Customer` volta a ser puramente uma entidade de negócio (PF ou PJ): `name`, `document`, `type`, `email`, `phone`, `address`. Perde `passwordHash` e qualquer capacidade de autenticação.
- Uma pessoa pode estar vinculada a um ou mais `Customer` através da nova tabela `UserCustomerAccess` (`userId`, `customerId`, `relationship: SELF | REPRESENTATIVE`, `@@unique(userId, customerId)`):
  - `SELF`: o próprio `User` é a pessoa física titular daquele `Customer` PF. Exige `User.document === Customer.document`, validado na criação do vínculo.
  - `REPRESENTATIVE`: o `User` (pessoa física) representa um `Customer` PJ. Não há exigência de igualdade de documento (o CPF do representante é naturalmente diferente do CNPJ da empresa).
- **Cliente PJ nunca loga diretamente** — não tem `passwordHash`, não tem conta própria. Só é acessado através de um `User` PF vinculado como `REPRESENTATIVE`.
- Login continua sendo exclusivamente `POST /auth/login` (`identifier` = e-mail ou documento), sem endpoint de login dedicado a cliente.

## Provisionamento de acesso

`POST /customers` deixa de gerar senha ou enviar e-mail de acesso — só cria o registro de negócio.

Quando o admin decide dar acesso a um cliente:
1. Cria um `User` normal via `POST /users` (já existente), com `role: CUSTOMER` e `document` = CPF da pessoa. Isso reaproveita o fluxo de criação de usuário já implementado (senha definida no cadastro, sem geração automática/e-mail — mesmo comportamento hoje aplicado a ADMIN/MECHANIC/ATTENDANT).
2. Vincula esse `User` a um ou mais `Customer` através de um novo endpoint (ex.: `POST /customers/:id/access`, `{ userId, relationship }`), que grava a linha em `UserCustomerAccess` e valida a regra de igualdade de documento para `SELF`.

Não existe provisionamento automático (nem na criação do cliente, nem na aprovação de orçamento) — é sempre uma ação explícita do admin, evitando criar login para clientes que nunca vão precisar dele.

## Autorização e escopo de consulta

- `@Roles(UserRole.ADMIN, UserRole.MECHANIC, UserRole.ATTENDANT, UserRole.CUSTOMER)` em `GET /work-orders` e `GET /work-orders/:id` — CUSTOMER passa a poder chamar esses dois endpoints (os mesmos já existentes, sem duplicar lógica de consulta).
- Para chamadas com `role: CUSTOMER`, o escopo de `customerId` **nunca** vem da query string. O backend resolve os `customerId`s permitidos a partir de `UserCustomerAccess` (todas as linhas onde `userId` = `sub` do JWT, seja `SELF` ou `REPRESENTATIVE`) e filtra sempre por esse conjunto — qualquer `?customerId=` enviado na query é ignorado para esse papel. Isso evita IDOR/BOLA (um cliente não tem como, nem tentando, listar ordens de serviço de outro cliente).
- `GET /work-orders/:id`: se a OS existe mas seu `customerId` não está no conjunto permitido do `CUSTOMER` que chamou, responde **404** (não 401/403) — não revela que o ID existe e pertence a outro cliente.
- Nenhum outro endpoint (usuários, clientes, serviços, peças/insumos, orçamentos, estoque) passa a aceitar `CUSTOMER` — a role só é adicionada explicitamente em `GET /work-orders` e `GET /work-orders/:id`.
- A decisão de orçamento (aprovar/rejeitar) **continua exclusivamente pelo fluxo de e-mail já existente** (`GET /quotes/:id/decisions?token=`). Não há endpoint autenticado de decisão de orçamento para cliente — isso reduz o escopo da feature anterior, que incluía `GET /quotes/me` e `PATCH /quotes/:id/decisions`.

## O que é removido da implementação anterior

Toda a infraestrutura de autenticação dedicada a `Customer`, criada na feature anterior, é removida:

- `Customer.passwordHash`, `Customer.changePassword()`, `Customer.validatePasswordStrength()`.
- `JwtCustomerStrategy`, `JwtCustomerAuthGuard`, `CustomerTokenPayload`, `@CurrentCustomer()`.
- Endpoints `POST /auth/customer/login`, `POST /auth/customer/refresh`, `GET /auth/customer/me`, `PATCH /auth/customer/password`.
- `AuthenticateCustomerUseCase`, `RefreshCustomerTokenUseCase`, `ChangeOwnCustomerPasswordUseCase`, `ResetCustomerPasswordUseCase`.
- `CustomerQuoteController` (`GET /quotes/me`, `PATCH /quotes/:id/decisions`), `AuthenticatedQuoteDecisionUseCase`, `FindPendingQuotesForCustomerUseCase`.
- `PATCH /customers/:id/password` (reset de senha de cliente pelo admin) — não existe mais senha de cliente para redefinir.
- Variáveis `CUSTOMER_JWT_SECRET`, `CUSTOMER_JWT_EXPIRATION`, `CUSTOMER_JWT_REFRESH_SECRET`, `CUSTOMER_JWT_REFRESH_EXPIRATION` (`.env.example`, `docker-compose.yml`).
- Registro Swagger `customer-access-token`.
- Geração automática de senha + e-mail de boas-vindas em `CreateCustomerUseCase`.
- Helpers e specs de e2e específicos de login de cliente (`customer-auth.helper.ts`, `customer-auth.e2e-spec.ts`, `customer-password.e2e-spec.ts`, `quote-customer-decision.e2e-spec.ts`).

## Duplicação de documento (CPF)

`User.document` e `Customer.document` continuam existindo como campos independentes (nenhuma tabela `NaturalPerson` compartilhada é criada agora — mudança maior, sem necessidade concreta no tamanho atual do projeto). A única garantia é: para `relationship: SELF`, os dois valores devem ser iguais, validada no momento da criação do vínculo em `UserCustomerAccess`. Se essa necessidade crescer (uma pessoa com muitos vínculos, múltiplos sistemas consultando o mesmo CPF), normalizar para uma entidade `NaturalPerson` compartilhada fica como evolução futura, não uma migração antecipada.

## Migração dos dados existentes

- Seed (`user.seed.ts`, `customer.seed.ts`): os 3 clientes seedados perdem `passwordHash`. Um dos clientes PF do seed (João da Silva) ganha um `User(role: CUSTOMER, document igual ao document do Customer)` + vínculo `SELF`. O cliente PJ do seed (Oficina Parceira LTDA) ganha um `User(role: CUSTOMER)` distinto vinculado como `REPRESENTATIVE`, para exercitar os dois relacionamentos no seed. O outro cliente PF (Maria Souza) permanece sem nenhum `User`/vínculo, demonstrando o caso "cliente cadastrado sem acesso provisionado".
- Migration do banco: `ALTER TABLE customers DROP COLUMN password_hash`; nova tabela `user_customer_access`.

## Testes

- Specs unitárias e e2e da feature anterior relacionadas a autenticação/senha/decisão de cliente são removidas ou reescritas para o novo modelo.
- Nova cobertura: criação de vínculo (`SELF` exige documento igual; `REPRESENTATIVE` não exige), `GET /work-orders`/`GET /work-orders/:id` com `role: CUSTOMER` (escopo restrito ao vínculo, `?customerId=` ignorado, 404 para OS de outro cliente), login por CPF de um `User(CUSTOMER)`, ausência de qualquer endpoint de auth/senha específico de cliente.

## Referências

- Comentários de revisão de `lucas-almeida-silva` na PR #57.
- Sessão de IA (ChatGPT) linkada no comentário do ADR 0003, adotada como base desta proposta.
- `docs/adr/0004-user-como-identidade-unica-autenticavel-via-usercustomeraccess.md` (a ser escrito) — substitui a decisão do ADR 0003.
