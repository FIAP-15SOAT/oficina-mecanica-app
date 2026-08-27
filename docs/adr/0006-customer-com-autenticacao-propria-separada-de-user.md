# ADR 0006: `Customer` ganha autenticação própria, separada de `User`

## Status

Substituído pelo ADR [0004-user-como-identidade-unica-autenticavel-via-usercustomeraccess.md](0004-user-como-identidade-unica-autenticavel-via-usercustomeraccess.md) — 2026-08-25. Mantido aqui por completude histórica; a decisão vigente é a do ADR 0004.

Aceito — 2026-08-21

## Contexto

Hoje `Customer` não tem nenhum mecanismo de login — só interage com o sistema aprovando/rejeitando orçamento via link assinado por e-mail, sem sessão, sem senha. Ao revisar a feature de documento (CPF/CNPJ) no `User`, um colega da equipe sugeriu que o cliente passasse a logar no sistema, e propôs literalmente: login só por CPF, com a tabela `User` ganhando uma FK opcional para `Customer` (representando um "operador" de uma empresa cliente PJ acessando o sistema) — reargumentado depois com o reframe "`User` agora não significa só funcionário da oficina, significa usuários quaisquer que tem acesso ao sistema".

Essa segunda proposta (identidade genérica + FK de perfil) é um padrão real, usado em várias plataformas (tabela de conta única + perfil por tipo). Não foi descartada por ser inválida, mas por não se encaixar bem neste projeto especificamente.

## Decisão

`Customer` ganha seu próprio `passwordHash` e seu próprio fluxo de autenticação (`POST /auth/customer/login`, guard e estratégia JWT dedicados, secrets próprios), completamente separado do de `User`. `User` continua representando exclusivamente a equipe interna da oficina (ADMIN/MECHANIC/ATTENDANT); `Customer` continua sendo o cliente da oficina (PF ou PJ), agora também podendo se autenticar.

## Alternativas consideradas

### A — `User` como identidade genérica, com FK opcional para `Customer` (proposta do colega)
Um `User` que representa um cliente teria `role` indicando isso (ou nenhum papel de staff) e uma FK `customerId` preenchida. Rejeitada por três motivos:
1. **Linguagem ubíqua já estabelecida e documentada**: o C4 do projeto (`docs/c4/`) e `docs/architecture.md` já modelam "Usuários" e "Clientes" como módulos de negócio distintos. Redefinir `User` para incluir cliente desalinharia essa documentação já existente e exigiria redesenhar o C4.
2. **Ciclos de vida incompatíveis no mesmo caso de uso**: `CreateUserUseCase`/`UpdateUserUseCase` são pensados para o ciclo de vida de funcionário (role trocada por admin, `isActive` ligado a status de emprego). O ciclo de vida do cliente é outro (sem "role" para trocar, sem admin desativando por demissão). Acomodar os dois exigiria ramificação condicional extensa nos mesmos casos de uso.
3. **Não resolve cliente pessoa física isoladamente**: a proposta original descrevia apenas o caso de "operador de empresa PJ" — todo cliente PF que precisasse logar também exigiria uma linha-sombra em `User`, sinal de que `Customer` deveria ser a própria identidade de login.

### B — Login do cliente reaproveitando `POST /auth/login` existente
Rejeitada: exigiria que o mesmo endpoint tentasse resolver o `identifier` tanto contra `User` quanto contra `Customer`, misturando os dois domínios de autenticação de novo na borda HTTP, mesmo com as tabelas separadas.

## Consequências

### Positivas
- RBAC de staff (`UserRole`) permanece um conceito fechado, sem precisar acomodar um papel de "cliente" que nunca deveria ter as mesmas permissões.
- Dois domínios de autenticação estruturalmente isolados: token de cliente nunca é aceito por guard de staff (e vice-versa), mesmo que uma rota seja protegida pelo guard errado por engano — a estratégia Passport do lado errado simplesmente não resolve o `sub` na tabela que espera.
- `Customer` já era um aggregate root paralelo a `User` no domínio (`Customer`, `Vehicle`, `Service`, etc.) — dar autenticação a ele é extensão natural do que já existe, não um bolt-on em `User`.
- Mantém consistência com o C4 e a documentação de arquitetura já publicados.

### Negativas / Trade-offs
- Algum código é duplicado em espírito (dois fluxos de login, duas estratégias JWT, dois endpoints de troca de senha) — mitigado escrevendo os dois casos de uso de troca de senha com a mesma regra (self vs. admin + e-mail), e reaproveitando a interface `ITokenService` genérica (`signWithSecret`/`verifyWithSecret`, já usada hoje pelo token de decisão de orçamento) em vez de criar uma segunda abstração de serviço de token.
- Dois pares de secrets JWT para gerenciar (`JWT_SECRET`/`JWT_REFRESH_SECRET` para staff, `CUSTOMER_JWT_SECRET`/`CUSTOMER_JWT_REFRESH_SECRET` para cliente) — mesmo padrão já em uso para o `QUOTE_DECISION_TOKEN_SECRET`, então não é um precedente novo no projeto.

### Riscos mitigados
- **Confusão de identidade entre staff e cliente**: mitigada estruturalmente por tabelas, guards, estratégias e secrets separados — não depende de nenhum desenvolvedor lembrar de checar um discriminador em cada guard novo.
- **Caso de "operador de empresa PJ" ficar sem solução**: não é resolvido nesta decisão, mas fica deliberadamente aberto para ser modelado depois como uma relação própria (quem pode agir em nome de um `Customer`), sem nunca ter acoplado esse conceito à tabela de staff — mais fácil de adicionar depois do que de desfazer um acoplamento prematuro.

## Referências

- `docs/superpowers/specs/2026-08-21-customer-login-design.md` — spec da feature que motivou esta decisão.
- `docs/adr/0005-document-value-object-compartilhado-entre-user-e-customer.md` — decisão anterior relacionada (generalização do VO `Document`), que estabeleceu o precedente de generalizar o que é genuinamente compartilhado (validação de documento) sem misturar o que não é (identidade de staff vs. cliente).
