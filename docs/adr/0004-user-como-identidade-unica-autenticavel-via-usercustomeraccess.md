# ADR 0004: `User` como identidade única autenticável, ligada a `Customer` via `UserCustomerAccess`

## Status

Aceito — 2026-08-25. Substitui a decisão do ADR `0006-customer-com-autenticacao-propria-separada-de-user.md`.

## Contexto

O ADR 0006 deu a `Customer` seu próprio `passwordHash` e um domínio de autenticação completo, separado do de `User` (guard, estratégia JWT, secrets e casos de uso próprios), justamente para evitar misturar o RBAC interno da equipe com o acesso do cliente.

Na revisão da PR que implementava essa decisão (#57), um colega da equipe (Lucas) discordou de forma consistente em praticamente todos os pontos de contato do código com o tema: para ele, a única coisa que diferencia um cliente logado de qualquer outro usuário é a *role* atribuída — o cliente não deixa de ser um usuário, do mesmo jeito que mecânico, admin e atendente já são papéis de um mesmo conceito de identidade. Ele trouxe três sessões de IA (ChatGPT, Claude, Gemini) que convergiram numa proposta semelhante; a mais completa (ChatGPT) foi usada como base para a decisão abaixo.

## Decisão

`User` passa a ser a única identidade autenticável do sistema — ganha o valor `CUSTOMER` no enum `UserRole`. `Customer` volta a ser puramente uma entidade de negócio (sem `passwordHash`, sem capacidade de login). O vínculo entre quem loga e qual(is) cliente(s) ele pode consultar é modelado por uma tabela N:N, `UserCustomerAccess` (`userId`, `customerId`, `relationship: SELF | REPRESENTATIVE`), em vez de uma FK direta em `User`.

Ver `docs/superpowers/specs/2026-08-25-user-customer-access-design.md` para o detalhamento completo (modelo de dados, provisionamento, autorização, remoções, migração).

## Por que reabrir uma decisão já tomada

O ADR 0006 já tinha avaliado e rejeitado uma proposta parecida (identidade genérica + FK opcional de `User` para `Customer`) pelo motivo específico de que ela "não resolve cliente pessoa física isoladamente" — a FK única não suportava uma pessoa que é ao mesmo tempo cliente PF de si mesma e representante de uma ou mais empresas.

A proposta trazida agora resolve exatamente essa lacuna: em vez de uma FK 1:1, usa uma tabela N:N (`UserCustomerAccess`) com um discriminador de relacionamento (`SELF` / `REPRESENTATIVE`). Isso muda o cálculo — a alternativa rejeitada no ADR 0006 e a alternativa aceita aqui não são a mesma proposta, mesmo superficialmente parecidas.

## Alternativas consideradas

### A — Manter a decisão do ADR 0006 (domínios de autenticação separados)
Rejeitada. O argumento original de "isolamento por secrets diferentes previne todo um tipo de bug de autorização" foi contestado com razão: essa proteção é, na prática, o que um `RolesGuard` correto já entrega — autorização (o que a identidade pode fazer) é uma preocupação distinta de autenticação (quem é a identidade), e não precisa de infraestrutura de login duplicada para existir. Manter dois guards, duas estratégias JWT, dois pares de secret e dois fluxos de troca/reset de senha era duplicação real sem ganho de segurança proporcional.

### B — `customerId` como FK direta em `User` (proposta original do colega, já rejeitada no ADR 0006)
Rejeitada de novo, pelo mesmo motivo já registrado: não suporta uma pessoa vinculada a múltiplos clientes (ela mesma + uma ou mais empresas que representa) sem um campo nulo/sombra.

### C — Tabela `NaturalPerson` compartilhada entre `User` e `Customer` (mencionada na sessão de IA, não escolhida)
A própria proposta trazida pelo colega recomendou não adotar essa normalização agora, por ser uma refatoração maior sem necessidade concreta no tamanho atual do projeto. `User.document` e `Customer.document` continuam como campos independentes, com a garantia de igualdade aplicada apenas no momento de criar um vínculo `SELF`.

## Consequências

### Positivas
- Elimina a duplicação de infraestrutura de autenticação (um único login, um único guard, um único fluxo de refresh/troca de senha) apontada como o maior custo do ADR 0006.
- `UserCustomerAccess` resolve o caso de pessoa física que também representa uma ou mais empresas, sem FK nula e sem linha-sombra — o motivo que havia descartado a proposta B na primeira rodada.
- Autorização de escopo (quais `customerId`s um `CUSTOMER` pode consultar) fica centralizada na resolução via `UserCustomerAccess` no momento da consulta, nunca no JWT nem em parâmetro de query — mitigação explícita de IDOR/BOLA.
- `Customer` continua sendo um conceito de domínio/negócio distinto de `User` (mantém o alinhamento com o C4 e `architecture.md`) — só a autenticação foi unificada, não os conceitos de negócio.

### Negativas / Trade-offs
- `User.document` e `Customer.document` coexistem como fontes potencialmente divergentes para a mesma pessoa (mitigado pela validação de igualdade só exigida em `relationship: SELF`).
- Reabrir uma decisão já implementada e testada (branch `feature/customer-login`, PR #57) tem custo de retrabalho — parte considerável do código daquela feature é removida nesta reformulação.
- Cliente PJ deixa de poder logar diretamente (mudança de requisito, não só de implementação) — precisa sempre de um representante PF vinculado.

## Referências

- `docs/superpowers/specs/2026-08-25-user-customer-access-design.md` — spec desta decisão.
- `docs/adr/0006-customer-com-autenticacao-propria-separada-de-user.md` — decisão substituída por esta.
- Comentários de `lucas-almeida-silva` na PR #57 (https://github.com/FIAP-15SOAT/oficina-mecanica-app/pull/57).
