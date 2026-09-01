# ADR 0004: Autenticação externa de clientes por CPF via função serverless

## Status

Aceita

## Contexto

O sistema precisa permitir que o Cliente da Oficina (pessoa física, dona do
veículo ou representante de uma pessoa jurídica atendida) aprove ou rejeite
orçamentos autenticando-se, substituindo o `GET` público com token na query
string usado até então. O enunciado do desafio descreve o fluxo como "CPF,
consulta de existência e emissão do token" — sem mencionar senha
explicitamente.

## Decisão

- **Identidade (`User`) e parte comercial (`Customer`) permanecem entidades
  diferentes.** Uma pessoa física pode ser cliente de si mesma e representar
  várias empresas; uma empresa nunca tem credenciais.
- **A role interna (`User.role`) torna-se opcional.** Não é criado um valor
  `CUSTOMER` no enum `UserRole`: esse enum descreve permissão *dentro* da
  oficina, e um cliente externo não possui nenhuma.
- **Conceder acesso a um cliente sempre cria um `User` novo; nunca reaproveita
  um existente.** Se o CPF ou e-mail informado já pertence a qualquer usuário
  — interno ou externo, de qualquer outro cliente —, a operação retorna
  conflito (409), o mesmo tratamento já usado na criação administrativa de
  usuários (`POST /api/users`). Uma versão inicial deste desenho previa
  reaproveitar automaticamente um `User` existente com o mesmo CPF (permitindo
  que a mesma pessoa acessasse vários `Customer`, ou que um funcionário também
  fosse cliente); a ideia foi descartada por criar um vínculo automático e
  silencioso — sem uma ação explícita de criação — a partir de um dado público
  como o CPF. A consequência aceita é que, hoje, uma mesma pessoa não pode ter
  acesso a mais de um `Customer`, nem acumular role interna e vínculo externo,
  ao mesmo tempo.
- **Não existe `accessType` no vínculo `UserCustomer`.** A semântica do
  vínculo (acesso próprio vs. representação de empresa) deriva de
  `Customer.type`, evitando um campo redundante e potencialmente
  inconsistente.
- **Dois fluxos de autenticação totalmente isolados**, com duas estratégias
  Passport distintas (`jwt` HS256 interno, `customer-jwt` RS256 externo).
  Nunca um único verificador que aceite os dois algoritmos — isso eliminaria,
  por construção, a classe de ataque de confusão de algoritmo.
- **A autenticação externa exige senha, além do CPF.** CPF é identificador
  público, não segredo — usá-lo sozinho como credencial permitiria
  autenticação por qualquer pessoa que conheça o CPF de outra. A leitura
  adotada é que "autenticação por CPF" significa CPF como identificador, à
  semelhança de qualquer banco brasileiro, não como credencial isolada. Este é
  o único ponto do desenho cuja validação dependeu de confirmação externa ao
  time (ver §25.1 da especificação de referência).
- **A função de autenticação é serverless e autônoma**, consultando o banco
  diretamente — nunca um proxy do `POST /api/auth/login` interno. Ela assina
  um JWT assimétrico (RS256); a API principal possui apenas a chave pública
  de verificação.
- **O `GET /api/quotes/:id/decisions?token=...` público é removido.** Um
  `GET` que altera estado é executável por prefetch de cliente de e-mail ou
  scanner de segurança antes que a pessoa leia a mensagem, e o token na URL
  contornaria a autenticação por CPF e senha.
- **Autorização dinâmica por vínculo, nunca embutida no token.** O JWT
  externo não carrega `customerId`: cada operação sensível consulta
  `UserCustomer` no banco, fazendo remoções de vínculo e desativações de
  cliente valerem imediatamente, sem lista de revogação.

## Riscos aceitos

- Senha inicial e código de reset trafegam por e-mail (mitigado por geração
  aleatória forte, armazenamento somente como hash, e reset administrativo
  disponível).
- Troca ou reset de senha não revogam tokens já emitidos (mitigado pela
  recarga de `isActive` e do vínculo a cada requisição).
- Não há limitação de frequência de requisições nesta entrega (risco
  preexistente no login interno, não introduzido por esta mudança).

## Consequências

- Toda rota `/api/me/*` precisa resolver o conjunto de clientes vinculados a
  cada requisição — não há atalho de cache no payload do JWT.
- A função serverless (fora desta entrega) herda um contrato de claims e
  algoritmo já fechado, restando apenas trabalho de implementação e
  infraestrutura (decisões de biblioteca, empacotamento e IaC ficam
  registradas como dívida explícita, não como redecisão).
