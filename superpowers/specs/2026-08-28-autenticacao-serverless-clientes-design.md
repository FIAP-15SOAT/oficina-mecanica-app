# Especificação — autenticação serverless de usuários externos por CPF e senha

**Data:** 28 de agosto de 2026 · **revisado em** 29 de agosto de 2026
**Status:** desenho aprovado em conversa; pronto para plano de implementação
**Escopo:** API NestJS, modelo PostgreSQL/Prisma, documentação operacional e o desenho — não a implementação — da função AWS Lambda de autenticação

> **Recorte desta entrega.** A Lambda **não será implementada agora**. Esta entrega constrói o modelo de identidade, os vínculos, as rotas autenticadas do usuário, a concessão de acesso e a **verificação** do token externo. A seção 11 especifica a função por completo, para que a implementação futura não precise redecidir nada estrutural; as decisões puramente de implementação dela estão marcadas como **diferidas**.

## 1. Resumo executivo

O sistema passará a separar explicitamente três conceitos:

- `User` representa uma pessoa física com credenciais;
- `Customer` representa o cliente comercial da oficina, que pode ser pessoa física ou jurídica;
- `UserCustomer` concede a um usuário acesso a um cliente específico.

Pessoa jurídica não autentica e CNPJ nunca será credencial. Uma pessoa física poderá acessar o próprio cadastro de cliente pessoa física e também representar uma ou mais empresas. Um mesmo usuário poderá adquirir ou perder esses vínculos ao longo do tempo sem ser recriado, e poderá acumular papel interno e vínculos externos simultaneamente.

Existirão dois fluxos de autenticação independentes:

- funcionários autenticam na API por e-mail e senha, como já ocorre;
- usuários externos autenticarão por CPF e senha em uma função serverless.

A função consultará diretamente o banco, validará CPF, senha, estado da conta e existência de ao menos um vínculo com cliente ativo, e assinará um JWT assimétrico. Ela não será proxy do endpoint de login da API. A API validará esse JWT com uma estratégia separada e sempre consultará os vínculos atuais antes de disponibilizar qualquer recurso.

Enquanto a função não existir, **nenhum componente emite token externo**. A API já saberá verificá-lo, e testes, varredura de segurança e demonstração usarão tokens assinados com um par de chaves de teste.

## 2. Contexto do sistema atual

Na versão existente:

- `User` possui `name`, `email`, `passwordHash`, uma `role` obrigatória entre `ADMIN`, `MECHANIC` e `ATTENDANT`, e `isActive`;
- `Customer` possui CPF ou CNPJ, mas não possui credenciais nem relacionamento com `User`;
- funcionários autenticam por `POST /api/auth/login`, recebem access token e refresh token e são autorizados pelo par `JwtAuthGuard`/`RolesGuard`;
- `JwtStrategy` recarrega o usuário pelo `sub` e exige `isActive`;
- o JWT interno usa `JWT_SECRET` e o refresh token usa `JWT_REFRESH_SECRET`, ambos HS256;
- a decisão de orçamento enviada por e-mail é executada por um `GET` público com token de ação na query string;
- ordens de serviço e orçamentos pertencem a um `Customer`;
- `GET /api/auth/me` devolve a identidade do funcionário autenticado;
- não existe limitação de frequência de requisições em nenhuma rota.

O novo requisito não substitui a autenticação interna. Ele adiciona uma fronteira de autenticação e autorização para pessoas externas.

## 3. Objetivos

Esta mudança deve:

1. preparar a autenticação de pessoa física externa por CPF e senha em função serverless, especificando-a por completo;
2. impedir autenticação somente pelo conhecimento de um CPF;
3. manter o login de funcionários por e-mail e senha;
4. permitir que uma pessoa acesse o próprio cliente pessoa física e represente várias empresas;
5. permitir adicionar e remover vínculos sem excluir o usuário ou o cliente;
6. permitir que o mesmo usuário possua, simultaneamente, acesso interno e externo;
7. restringir cada consulta ou alteração externa aos clientes atualmente vinculados ao usuário;
8. permitir consulta de ordens e orçamentos dos clientes vinculados;
9. exigir autenticação externa e verificação de vínculo para aprovar ou rejeitar orçamento;
10. oferecer criação de conta com senha inicial, alteração autenticada de senha e reset administrativo por código numérico;
11. tornar o estado ativo do cliente uma regra coerente em toda a aplicação, não apenas no acesso externo;
12. documentar os dois fluxos, as rotas públicas e a matriz de permissões no README e na documentação do projeto.

## 4. Fora de escopo

Não fazem parte desta entrega:

- **a implementação da função serverless, sua infraestrutura AWS e seu pipeline** — apenas o desenho, na seção 11;
- frontend, tela de login ou tela de decisão de orçamento;
- autenticação de pessoa jurídica ou login por CNPJ;
- autenticação somente por CPF;
- login interno por CPF (o modelo não impede a evolução, mas ela não entra agora);
- convite, estado `PENDING`, senha vazia ou ativação posterior da conta;
- login social, MFA ou provedor de identidade externo;
- recuperação de senha iniciada anonimamente pelo próprio usuário;
- limitação de frequência de requisições (rate limiting) — ver seção 17 para o risco residual;
- bloqueio persistente da conta por tentativas de login;
- revogação imediata de access tokens após troca ou reset de senha;
- lista de revogação de JWT, rotação automática de chaves ou endpoint JWKS;
- permitir ao usuário externo cadastrar uma ordem de serviço;
- edição externa de clientes, veículos, ordens ou itens de orçamento;
- consulta externa de dados cadastrais do cliente e de veículos;
- preservação do `GET` público que hoje aprova ou rejeita orçamento pelo link do e-mail.

## 5. Terminologia

| Termo | Significado |
| --- | --- |
| Usuário | Pessoa física identificável que possui credenciais na tabela `users`. |
| Funcionário | Usuário com papel interno `ADMIN`, `MECHANIC` ou `ATTENDANT`. |
| Usuário externo | Usuário habilitado a autenticar por CPF e senha por possuir ao menos um vínculo com cliente ativo. |
| Cliente | Parte comercial atendida pela oficina; pode ser `INDIVIDUAL` ou `COMPANY`. |
| Operador externo | Pessoa física que representa um cliente `COMPANY`; não se torna o cliente. |
| Vínculo de acesso | Relação entre `User` e `Customer` que define o escopo externo. |
| Token interno | JWT HS256 emitido pela API após login por e-mail e senha. |
| Token externo | JWT RS256 emitido pela função serverless após login por CPF e senha. |

O termo "operador externo" não corresponde às roles internas da aplicação. Ele descreve a relação de uma pessoa física com uma empresa.

## 6. Decisões arquiteturais

### 6.1 Identidade e cliente permanecem entidades diferentes

Credenciais pertencem sempre a `User`. `Customer` não terá senha e uma empresa nunca será transformada em usuário.

Essa separação é necessária porque:

- nem todo cliente precisa acessar o sistema;
- uma empresa pode ter vários representantes;
- uma pessoa pode representar várias empresas;
- uma pessoa pode ser cliente individual e representante de empresa ao mesmo tempo;
- uma pessoa pode ser funcionária da oficina e cliente dela ao mesmo tempo;
- remover uma representação não deve apagar a identidade nem o histórico do usuário.

### 6.2 A role interna será opcional

`User.role` passará a ser opcional:

- usuário exclusivamente externo: `role = null`;
- funcionário: uma das roles internas existentes;
- funcionário que também possui vínculos externos: mantém sua role interna e recebe os vínculos.

A existência de vínculo não altera a role interna. A concessão de acesso a cliente nunca poderá promover alguém para `ADMIN`, `MECHANIC` ou `ATTENDANT`.

Não será criado um valor `CUSTOMER` no enum `UserRole`. Aquele enum descreve permissão **dentro** da oficina, e um cliente não possui nenhuma; além disso, uma role única impediria de representar a pessoa que é funcionária e cliente simultaneamente.

O login interno deverá rejeitar, com a mesma mensagem genérica de credenciais inválidas, contas sem role interna. O login externo ignorará a role interna e exigirá vínculos ativos.

### 6.3 Não haverá `accessType`

O vínculo não armazenará `SELF`, `REPRESENTATIVE` ou campo equivalente. O tipo do cliente alvo já determina a semântica:

- vínculo com `Customer.type = INDIVIDUAL`: acesso da pessoa aos próprios dados;
- vínculo com `Customer.type = COMPANY`: representação da empresa.

As permissões externas são iguais nos dois casos. Portanto, `accessType` seria informação derivável e sujeita a inconsistência.

### 6.4 Os dois fluxos de autenticação serão isolados

| Característica | Funcionário | Usuário externo |
| --- | --- | --- |
| Identificador | E-mail | CPF |
| Segredo apresentado | Senha | Senha |
| Emissor | API NestJS | Função serverless |
| Algoritmo | HS256 (`JWT_SECRET`) | RS256 (chave privada exclusiva) |
| Token | Access + refresh | Access token, sem refresh |
| Autorização | Role interna | Vínculo atual com o cliente do recurso |

Não será criado um login por CPF dentro da API principal. Isso tornaria a função dispensável e contrariaria a responsabilidade serverless pedida no entregável.

O isolamento será obtido por **duas estratégias Passport distintas**, e não por uma estratégia única que escolha a chave conforme o cabeçalho do token. Aceitar HS256 e RS256 no mesmo verificador introduz a classe de ataque de confusão de algoritmo, que passaria a depender de um mapeamento correto entre `alg` e chave; com estratégias separadas, o token externo nunca alcança o verificador HMAC e a classe deixa de existir.

### 6.5 A função consultará o banco diretamente

A função não chamará `POST /api/auth/login` e não dependerá da disponibilidade da API para autenticar. Ela executará somente o caso de uso de autenticação externa:

1. validar e normalizar o CPF;
2. localizar o usuário pelo CPF;
3. verificar `User.isActive`;
4. verificar a senha com o hash bcrypt existente;
5. confirmar que existe ao menos um vínculo com `Customer.isActive = true`;
6. assinar e devolver o JWT externo.

A consulta deverá usar uma conta de banco de menor privilégio, limitada às leituras necessárias de `users`, `user_customers` e `customers`.

### 6.6 O acesso será concedido explicitamente, com um caso de uso único

Conceder acesso é uma operação de aplicação bem definida: criar ou reutilizar o usuário, criar o vínculo e enviar a senha inicial apenas quando a conta for nova. Ela existe obrigatoriamente, porque um operador de pessoa jurídica só pode ser cadastrado assim — no cadastro de uma empresa não há CPF de pessoa alguma para virar usuário.

Para cliente `INDIVIDUAL`, o cadastro do cliente **poderá** disparar essa mesma operação:

- `POST /api/customers` aceita `createAccess`, com padrão `true` para `INDIVIDUAL`;
- quando verdadeiro, o caso de uso de cadastro **invoca o caso de uso de concessão**, não uma segunda implementação;
- `createAccess: false` cria apenas o cliente;
- `createAccess: true` com `type = COMPANY` é erro de validação, não silêncio.

Existe, portanto, um único algoritmo de concessão (seção 8.1) e dois chamadores. Isso entrega o padrão conveniente sem duplicar regra e sem impedir o cliente que não deve ter acesso.

### 6.7 Rotas externas terão contratos próprios sob `/api/me`

As rotas internas existentes não serão abertas para o usuário externo. Serão criadas rotas sob `/api/me`, com use cases e presenters específicos.

`/api/me` significa **escopo do sujeito autenticado**, não posse — é a convenção estabelecida por `/user/repos` no GitHub e `/me/playlists` no Spotify, onde a coleção reúne o que o sujeito pode acessar. Um prefixo como `/portal` seria nomear recurso pelo consumidor, o que acopla uma API agnóstica a um cliente que ela não conhece; essa é decisão de BFF, e o projeto não tem um.

Presenters próprios evitam expor campos internos, e as regras de autorização por recurso permanecem na camada de aplicação.

### 6.8 A decisão de orçamento deixará de ser um `GET` público

O endpoint público `GET /api/quotes/:id/decisions?token=...` será removido, e com ele o segredo `QUOTE_DECISION_TOKEN_SECRET`.

Três razões, em ordem de peso:

1. **Clientes de e-mail e scanners de segurança fazem prefetch de links.** Um `GET` que aprova orçamento pode ser disparado pelo antivírus do destinatário antes de a pessoa ler a mensagem. É um defeito ativo, independente desta entrega.
2. O token no link permitiria ignorar a autenticação por CPF e senha exigida pelo novo fluxo.
3. Um `GET` não deve produzir alteração de negócio.

O endpoint foi criado como atalho de demonstração, na ausência de frontend. Esse valor deixa de existir: sem frontend, a demonstração ocorre por Swagger/Postman de qualquer maneira, e o fluxo autenticado **é** a demonstração que o requisito pede.

O e-mail de orçamento continuará existindo como notificação, com resumo e orientação para autenticar, sem token capaz de decidir.

### 6.9 O estado ativo do cliente será uma regra da aplicação inteira

`Customer.isActive` não serve apenas ao acesso externo. Uma flag verificada em um só lugar mente sobre o que significa. Ela será validada em todos os pontos da seção 8.5.

## 7. Modelo de dados

O modelo conceitual esperado no Prisma é:

```prisma
model User {
  id                String             @id @default(uuid()) @db.Uuid
  name              String             @db.VarChar(150)
  email             String             @unique @db.VarChar(150)
  cpf               String?            @unique @db.VarChar(11)
  passwordHash      String             @map("password_hash") @db.VarChar(255)
  role              UserRole?
  isActive          Boolean            @default(true) @map("is_active")
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @default(now()) @updatedAt @map("updated_at")
  customerAccesses  UserCustomer[]
  passwordResetCode PasswordResetCode?

  @@map("users")
}

model Customer {
  // Campos atuais permanecem.
  isActive    Boolean        @default(true) @map("is_active")
  accessUsers UserCustomer[]
}

model UserCustomer {
  userId     String   @map("user_id") @db.Uuid
  customerId String   @map("customer_id") @db.Uuid
  createdAt  DateTime @default(now()) @map("created_at")

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@id([userId, customerId])
  @@index([customerId])
  @@map("user_customers")
}

model PasswordResetCode {
  userId    String   @id @map("user_id") @db.Uuid
  codeHash  String   @map("code_hash") @db.VarChar(255)
  attempts  Int      @default(0)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("password_reset_codes")
}
```

O trecho é normativo quanto a campos, nulabilidade e restrições, mas não substitui a edição completa do schema, que deverá preservar as relações atuais de `User` e `Customer`.

O índice `@@index([customerId])` é necessário porque a chave primária composta atende consultas iniciadas pelo usuário, e não a listagem de quem acessa um dado cliente.

### 7.1 Normalização e unicidade do CPF

- `User.cpf` armazenará exatamente 11 dígitos, sem pontuação;
- o campo se chama `cpf`, e não `document`, para não colidir com `Customer.document`, que guarda CPF **ou** CNPJ;
- a validação deverá rejeitar tamanho inválido, sequências repetidas e dígitos verificadores incorretos, reaproveitando `DocumentValidator` do domínio;
- o banco garantirá unicidade global do CPF quando preenchido;
- funcionários **podem** ter CPF; o campo é opcional para todos os perfis. A presença de CPF não habilita login externo — isso depende de vínculo (seção 6.2) — e a ausência de role interna é o que impede o login interno;
- CPF não será incluído no JWT nem registrado em log em texto puro.

O classificador de redação do projeto já trata `cpf` e `document` como sequências PII, com mascaramento preservando formato. Nenhuma regra nova de redação precisa ser escrita; basta que os campos usem esses nomes.

### 7.2 Invariantes dos vínculos

1. O par `(userId, customerId)` é único.
2. Um vínculo só pode apontar para usuário e cliente existentes.
3. Para cliente `INDIVIDUAL`, `User.cpf` deve ser igual a `Customer.document` normalizado.
4. Um usuário não pode ser vinculado como titular a uma pessoa física de CPF diferente.
5. Para cliente `COMPANY`, o CPF pertence ao operador, não ao cliente, e não precisa coincidir com o CNPJ.
6. Um usuário pode possuir qualquer quantidade de vínculos com empresas.
7. Um usuário pode ter, simultaneamente, seu vínculo individual e vínculos empresariais.
8. Remover um vínculo não remove o usuário nem o cliente.
9. Cliente inativo não fica disponível no escopo externo e não conta para habilitar novo login externo.
10. As invariantes que cruzam tabelas deverão ser validadas dentro da mesma transação do caso de uso.

Duas propriedades decorrem das invariantes 3 e 4 somadas à unicidade de `User.cpf` e `Customer.document`, e não precisam de verificação própria: um cliente `INDIVIDUAL` tem no máximo um usuário titular, e um operador nunca se torna cliente.

### 7.3 Migração dos dados existentes

- usuários existentes recebem `cpf = null` e preservam a role atual;
- clientes existentes recebem `isActive = true`;
- nenhum vínculo e nenhuma conta externa serão criados por backfill;
- senhas existentes permanecem válidas;
- o acesso externo será concedido explicitamente após a migração.

A migração é aditiva — coluna nulável, coluna com padrão, duas tabelas novas e um enum que passa a aceitar nulo. Nenhum dado existente é reescrito e o rollout não exige janela de indisponibilidade.

### 7.4 Alteração de dados que participam da identidade

- `User.cpf` não será alterável pelo próprio usuário;
- a concessão poderá preencher um CPF ainda nulo, mas nunca substituir um CPF já cadastrado;
- corrigir um CPF existente exigirá operação administrativa específica e ausência de vínculos; não fará parte das rotas desta entrega;
- alterar `Customer.type` enquanto houver vínculos será proibido;
- alterar o documento de um cliente `INDIVIDUAL` enquanto houver vínculo será proibido, pois quebraria a identidade do titular;
- alterar o CNPJ de um cliente `COMPANY` não altera os representantes, desde que o tipo continue `COMPANY`;
- `Customer.email` é contato comercial e `User.email` é contato da identidade. Um não será sincronizado automaticamente com o outro.

A última regra é o que torna legítima a coexistência dos dois registros para a mesma pessoa: eles respondem a perguntas diferentes e têm ciclos de vida próprios.

## 8. Concessão e remoção de acesso

### 8.1 Conceder acesso

**Rota:** `POST /api/customers/:customerId/access-users`
**Autorização:** `ADMIN` ou `ATTENDANT`

Para cliente `INDIVIDUAL`, o corpo poderá ser vazio. Nome, e-mail e CPF virão do próprio cliente.

Para cliente `COMPANY`, o corpo será obrigatório:

```json
{
  "name": "Maria da Silva",
  "email": "maria@example.com",
  "cpf": "12345678909"
}
```

Algoritmo:

1. carregar o cliente e verificar que está ativo;
2. determinar os dados da pessoa conforme o tipo do cliente;
3. normalizar e validar o CPF e o e-mail;
4. pesquisar usuário por CPF e por e-mail;
5. se CPF e e-mail apontarem para usuários diferentes, responder conflito;
6. se houver usuário com o CPF, reutilizá-lo sem alterar automaticamente nome, e-mail, senha ou role;
7. se houver usuário somente pelo e-mail e seu CPF estiver vazio, associar o CPF informado e reutilizá-lo;
8. se o usuário encontrado pelo e-mail possuir outro CPF, responder conflito;
9. se nenhum usuário existir, gerar senha inicial forte, criar usuário ativo com `role = null` e enviar a senha ao e-mail;
10. validar as invariantes do vínculo e criá-lo;
11. registrar auditoria com o funcionário executor, usuário alvo e cliente.

Criação/reutilização do usuário e criação do vínculo deverão ocorrer em uma transação. O envio do e-mail ocorrerá **após o commit**, para não manter transação aberta durante I/O externo.

Este é o único algoritmo de concessão do sistema. `POST /api/customers` com `createAccess` verdadeiro o invoca; não existe segunda implementação.

A resposta não poderá conter a senha:

```json
{
  "data": {
    "userId": "uuid",
    "customerId": "uuid",
    "userCreated": true,
    "initialPasswordSent": true
  }
}
```

Erros esperados:

- `404`: cliente inexistente;
- `409`: vínculo já existente ou conflito de identidade entre CPF e e-mail;
- `422`: cliente inativo, CPF inválido ou tentativa de vincular pessoa física a CPF diferente.

Se o vínculo for persistido, mas o envio da senha inicial falhar, a operação continuará respondendo `201` com `initialPasswordSent = false`. A falha será auditada e o administrador poderá iniciar o reset. Retornar erro depois do commit induziria uma repetição insegura de uma operação que já foi concluída.

Uma repetição da operação nunca deverá gerar ou substituir senha de usuário existente.

### 8.2 Listar acessos de um cliente

**Rota:** `GET /api/customers/:customerId/access-users`
**Autorização:** `ADMIN` ou `ATTENDANT`

Retorna os usuários vinculados, para administrar representantes e obter o `userId` necessário à remoção. Senha e hashes nunca fazem parte da resposta.

### 8.3 Listar clientes de um usuário

**Rota:** `GET /api/users/:userId/customers`
**Autorização:** `ADMIN` ou `ATTENDANT`

O sentido inverso do anterior, e o mais usado na operação: antes de desativar um usuário ou investigar um acesso, é preciso saber o que aquela pessoa enxerga hoje. Retorna os clientes vinculados com identificação e estado ativo.

### 8.4 Remover acesso

**Rota:** `DELETE /api/customers/:customerId/access-users/:userId`
**Autorização:** `ADMIN` ou `ATTENDANT`
**Sucesso:** `204 No Content`

A operação remove apenas `UserCustomer`. A partir desse momento:

- o usuário não acessará novos dados desse cliente, mesmo portando JWT ainda válido;
- se não restar nenhum cliente ativo vinculado, novos logins externos serão recusados;
- uma conta com role interna continuará autenticando normalmente como funcionário;
- a conta não será excluída automaticamente.

### 8.5 Estado ativo do cliente

**Rota:** `PATCH /api/customers/:customerId/status`
**Autorização:** `ADMIN` ou `ATTENDANT`
**Corpo:** `{ "isActive": false }`

Desativar um cliente suspende imediatamente o acesso externo aos seus recursos, mas não apaga vínculos nem histórico. Reativá-lo restaura os vínculos existentes.

A flag será verificada em todos os pontos abaixo:

| Ponto | Comportamento com cliente inativo |
| --- | --- |
| Autenticação externa | Não conta para o requisito de "ao menos um vínculo ativo" |
| Rotas `/api/me/*` | Recursos do cliente não são acessíveis; respondem `404` |
| `POST /api/customers/:id/access-users` | Recusa (`422`) |
| `POST /api/vehicles` | Recusa cadastrar veículo para cliente inativo (`422`) |
| `POST /api/work-orders` | Recusa abrir ordem para cliente inativo (`422`) |
| `GET /api/customers` (staff) | Continua listando ativos e inativos; ganha filtro opcional `isActive` |
| Consultas internas de histórico | Permanecem acessíveis ao staff |

Desativar um cliente com ordens de serviço em aberto é **permitido**. A operação é reversível, e bloquear criaria impasse operacional — um veículo abandonado na oficina impediria para sempre a desativação do cadastro.

## 9. Criação e manutenção de usuários

### 9.1 Usuários internos

`POST /api/users` continuará restrito a `ADMIN`, mas deixará de receber senha definida pelo administrador. A API gerará uma senha inicial forte, criará o usuário ativo e a enviará por e-mail.

A entrada deverá conter `name`, `email`, `role` e `cpf` opcional. A role continua obrigatória nesse endpoint porque ele cria funcionário.

### 9.2 Senha inicial

- será gerada com fonte criptograficamente segura;
- terá no mínimo 12 caracteres e satisfará o `PASSWORD_REGEX` atual do domínio — maiúscula, minúscula, número e caractere especial;
- será armazenada somente como hash bcrypt, mantendo o custo configurável atual, cujo padrão é 12;
- aparecerá somente no e-mail enviado ao novo usuário;
- não será retornada pela API nem registrada em log;
- a conta já nascerá ativa, sem `PENDING`, convite ou senha nula.

A troca da senha inicial será recomendada, mas não haverá nesta entrega um estado `mustChangePassword` que bloqueie as demais operações.

### 9.3 Alteração autenticada da própria senha

**Rota:** `PATCH /api/me/password`
**Autorização:** token interno ou externo válido

```json
{
  "currentPassword": "SenhaAtual@123",
  "newPassword": "NovaSenha@456"
}
```

O caso de uso deverá:

1. identificar o usuário exclusivamente pelo `sub` validado;
2. conferir a senha atual;
3. validar a nova senha pela política de domínio;
4. impedir que a nova senha seja igual à atual;
5. substituir o hash em uma operação atômica;
6. retornar `204 No Content`.

O campo `password` deverá ser removido do contrato administrativo geral de atualização de usuário, para que mudança e reset tenham fluxos únicos e auditáveis.

O recurso é `password`, no singular, porque um usuário possui exatamente uma — diferente de `password-resets`, que é uma coleção de processos ao longo do tempo.

## 10. Reset administrativo de senha por código numérico

O código numérico substitui um link de reset na experiência do usuário, mas continua sendo um segredo temporário e receberá as mesmas proteções.

### 10.1 Emitir código

**Rota:** `POST /api/users/:userId/password-resets`
**Autorização:** somente `ADMIN`
**Sucesso:** `204 No Content`

Regras:

- gerar exatamente 6 dígitos com gerador criptograficamente seguro;
- expirar em 10 minutos;
- armazenar somente o hash do código;
- iniciar `attempts = 0`;
- substituir atomicamente qualquer código anterior do mesmo usuário;
- enviar o código ao e-mail atual do `User`;
- nunca incluir o código na resposta ou em log.

### 10.2 Confirmar reset

**Rota:** `POST /api/auth/password-reset-confirmations`
**Autorização:** pública, protegida pelo código temporário

```json
{
  "email": "maria@example.com",
  "code": "042731",
  "newPassword": "NovaSenha@456"
}
```

Regras:

1. responder com mensagem genérica para código inexistente, incorreto, expirado ou esgotado;
2. rejeitar código expirado;
3. incrementar tentativas a cada código incorreto;
4. invalidar o código ao atingir 5 tentativas;
5. validar a política da nova senha;
6. atualizar a senha e consumir o código uma única vez, na mesma transação serializável;
7. responder `204 No Content` no sucesso.

Gerar um novo código invalida o anterior, ainda que ele não tenha expirado. Código utilizado, expirado ou com tentativas esgotadas não poderá ser reutilizado.

A rota vive sob `/api/auth` porque é uma operação de credencial **sem** autenticação. A regra geral do projeto: `/api/auth` reúne o que se faz sem token — `login`, `refresh` e esta confirmação — e `/api/me` reúne o self-service autenticado.

### 10.3 Limitação aceita sobre sessões existentes

Alterar ou resetar a senha não revogará JWTs e refresh tokens já emitidos. Eles continuarão válidos até a expiração normal, salvo se o usuário for desativado. Essa limitação deverá ser registrada no README e em `docs/security.md`.

## 11. Autenticação externa — a função serverless

> **Diferida.** Esta seção especifica a função por completo. Nenhuma parte dela é implementada nesta entrega. As subseções marcadas como **decisão de implementação** ficam abertas até que a função entre em desenvolvimento; as demais são estruturais e não devem ser redecididas.

### 11.1 Contrato HTTP

**Rota:** `POST /customer-auth/login`, exposta publicamente
**Content-Type:** `application/json`

```json
{
  "cpf": "12345678909",
  "password": "Senha@123"
}
```

Sucesso:

```json
{
  "accessToken": "jwt",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

Respostas:

- `400`: formato de entrada inválido;
- `401`: CPF/senha inválidos, conta inativa ou ausência de cliente ativo vinculado;
- `500`: falha interna genérica, sem detalhes de banco ou chave.

Todos os casos de falha de credencial deverão usar a mesma mensagem pública, para reduzir enumeração de contas. Para CPF inexistente, a comparação deverá usar um hash bcrypt constante de referência, de modo a reduzir diferenças observáveis de tempo.

### 11.2 Passos do handler

1. validar método, content type e tamanho do corpo;
2. normalizar e validar CPF;
3. buscar usuário por CPF, incluindo somente os campos necessários;
4. verificar conta ativa;
5. comparar senha com bcrypt;
6. verificar a existência de vínculo com cliente ativo;
7. gerar claims mínimas;
8. assinar JWT;
9. registrar sucesso ou motivo técnico da falha, sem CPF, senha, hash ou token;
10. devolver resposta HTTP padronizada.

A função não criará usuário, não alterará senha, não administrará vínculos e não chamará endpoints da API principal.

### 11.3 Claims e assinatura

O token externo usará `RS256`:

- a função possuirá a chave privada de assinatura;
- a API possuirá somente a chave pública de verificação;
- as chaves serão independentes de `JWT_SECRET` e `JWT_REFRESH_SECRET`.

Claims obrigatórias:

```json
{
  "sub": "user-uuid",
  "iss": "oficina-customer-auth",
  "aud": "oficina-api",
  "iat": 1787932800,
  "exp": 1787936400
}
```

Regras:

- validade configurável por variável de ambiente (`CUSTOMER_JWT_TTL_SECONDS`), com padrão de 3600 segundos. O valor é mais longo que o do token interno porque **não existe refresh externo**; a mitigação é a recarga de `User.isActive` e a consulta do vínculo a cada requisição;
- nenhum CPF, e-mail ou `customerId` no token;
- nenhum refresh token externo;
- **nenhuma claim `auth_flow`.** O fluxo já é determinado por `iss`, `aud` e pelo algoritmo, todos verificados. O discriminador de fluxo usado internamente pela API é escrito pela estratégia que validou o token (seção 12), nunca lido dele — assim o valor não tem relação alguma com o conteúdo apresentado pelo cliente;
- verificação explícita de `alg = RS256`, `iss`, `aud` e `exp`;
- a API nunca aceitará o token externo na estratégia interna nem o token interno na estratégia externa.

Não gravar `customerId` no JWT é essencial: os vínculos serão consultados em cada operação sensível, fazendo remoções e desativações valerem imediatamente, sem lista de revogação.

### 11.4 Geração e custódia das chaves

O par RS256 será gerado **nesta entrega**, mesmo sem a função existir:

- a chave pública entra em `k8s/01-api-secret.yaml` como `CUSTOMER_JWT_PUBLIC_KEY`, renderizada por `sed` no `cd.yml` como os demais segredos;
- a chave privada é guardada fora do repositório até que a função exista, quando migrará para o gerenciador de segredos.

Assim a estratégia externa nasce configurada em vez de falhar por variável ausente, e a cerimônia acontece uma vez só.

### 11.5 Decisões de implementação (abertas)

Ficam registradas aqui para não serem redescobertas, e serão decididas quando a função entrar em desenvolvimento:

- **Biblioteca de hash.** O `bcrypt` usado pela API é módulo nativo e não executa em Lambda sem layer ou build na arquitetura correta. A saída provável é `bcryptjs`, JS puro, que verifica os mesmos hashes `$2a$`/`$2b$` — cerca de três vezes mais lento, irrelevante para uma comparação por login.
- **Compartilhamento da validação de CPF.** A função vive em outro repositório e não importa `@domain/*`. É preciso escolher entre duplicar `DocumentValidator` (algoritmo público e estável, registrado como dívida) e extrair um pacote npm compartilhado. Sem decisão, os dois lados divergem em silêncio.
- **Exposição.** API Gateway HTTP API é preferível a Function URL por oferecer limitação de frequência nativa numa rota de login público.
- **Conexão ao banco.** RDS Proxy é a recomendação; na exceção acadêmica, conexão direta ao RDS com reuso entre invocações e concorrência reservada limitada, documentada como adaptação de implantação.
- **Empacotamento, IaC e pipeline.** Repositório Terraform próprio no padrão do ecossistema (state em `bkt-oficina-mecanica`, consumindo `terraform_remote_state` de `infra-base` e `database`), mais o workflow de build e deploy, e a inclusão do novo stack no `tf-validate` do `ci.yml`.

## 12. Validação do token externo na API

A API adicionará uma estratégia Passport nomeada `customer-jwt`, separada da estratégia interna `jwt`.

O guard externo deverá:

1. extrair o Bearer token;
2. validar assinatura, algoritmo, emissor, audiência e expiração;
3. recarregar o usuário pelo `sub`;
4. verificar `User.isActive`;
5. verificar que ainda existe pelo menos um cliente ativo vinculado;
6. normalizar o principal autenticado para uso pelos controllers.

O principal distingue os fluxos sem forçar uma role interna inexistente:

```ts
type AuthenticatedPrincipal =
  | { sub: string; authFlow: 'INTERNAL'; email: string; role: UserRole }
  | { sub: string; authFlow: 'CUSTOMER'; email: string };
```

O campo `authFlow` é **atribuído pela estratégia que validou o token**, não extraído dele.

`GET /api/me` e `PATCH /api/me/password` utilizarão um guard que aceite qualquer uma das estratégias. As demais rotas `/api/me/*` aceitarão apenas token externo; rotas internas continuarão aceitando apenas token interno.

Enquanto não houver emissor externo, a estratégia `customer-jwt` estará plenamente funcional e configurada com a chave pública gerada na seção 11.4. Testes, varredura de segurança e demonstração assinam tokens com o par de chaves de teste correspondente.

## 13. Autorização externa por recurso

Autenticação confirma quem é a pessoa; o vínculo confirma quais clientes ela pode representar.

A verificação não ficará somente em um guard HTTP. Os use cases externos dependerão de uma política de aplicação capaz de afirmar acesso a determinado `customerId`, para que a regra permaneça válida caso o caso de uso seja acionado por outro adaptador.

Regras:

- listagens serão filtradas no banco pelos clientes vinculados, nunca filtradas em memória depois de buscar todos os registros;
- detalhe de ordem verificará `WorkOrder.customerId`;
- detalhe e decisão de orçamento verificarão `Quote → WorkOrder → customerId`;
- cliente inativo será tratado como não acessível;
- recurso inexistente e recurso de cliente não autorizado deverão retornar `404`, e nunca `403`, para o usuário externo — um `403` confirmaria a existência do recurso e transformaria a rota em oráculo de enumeração;
- a decisão deverá verificar vínculo dentro da mesma transação da alteração sempre que possível.

## 14. Rotas autenticadas do usuário

| Método e rota | Fluxo aceito | Comportamento |
| --- | --- | --- |
| `GET /api/me` | interno ou externo | Identidade do sujeito autenticado. |
| `PATCH /api/me/password` | interno ou externo | Troca autenticada da própria senha. |
| `GET /api/me/work-orders` | externo | Lista paginada das ordens dos clientes vinculados; filtro opcional `customerId`. |
| `GET /api/me/work-orders/:workOrderId` | externo | Detalhe externo da ordem. |
| `GET /api/me/work-orders/:workOrderId/quotes` | externo | Orçamentos da ordem vinculada. |
| `GET /api/me/quotes/:quoteId` | externo | Orçamento e itens permitidos. |
| `POST /api/me/quotes/:quoteId/decisions` | externo | Aprova ou rejeita o orçamento. |

`GET /api/auth/me` é substituído por `GET /api/me`. A mudança atinge `docs/api.md`, a collection Postman e os E2E de autenticação.

O usuário externo não poderá listar globalmente clientes, ordens ou orçamentos, e não poderá usar filtros para escapar do escopo dos vínculos.

Consulta de dados cadastrais do cliente e listagem de veículos ficam fora desta entrega: nenhuma delas é necessária para acompanhar uma ordem ou decidir um orçamento.

### 14.1 `GET /api/me`

Uma forma única, com os dois campos sempre presentes:

```json
{
  "data": {
    "id": "uuid",
    "name": "Maria da Silva",
    "email": "maria@example.com",
    "role": "MECHANIC",
    "customers": [
      { "id": "uuid", "name": "Transportadora XYZ", "type": "COMPANY" }
    ]
  }
}
```

`role` é `null` para usuário exclusivamente externo; `customers` é `[]` para funcionário sem vínculos. Uma resposta polimórfica por tipo de usuário seria pior: além de exigir `oneOf` no Swagger, esconderia justamente o caso que motivou tornar a role opcional — a pessoa que é funcionária **e** cliente, e que aqui aparece com os dois campos preenchidos.

Para o token interno, `customers` é preenchido normalmente quando houver vínculos; o campo descreve a pessoa, não o fluxo de autenticação.

### 14.2 Contratos externos de resposta

Presenters próprios deverão expor somente dados necessários ao cliente. Em especial, não deverão expor:

- `internalNotes` da ordem de serviço;
- e-mail ou role do funcionário responsável;
- preço de custo, margem, estoque reservado ou outros dados internos;
- dados de qualquer cliente não vinculado.

Poderão expor identificação do cliente e veículo, descrição do problema, status e datas da ordem, serviços e peças cobrados, quantidades, preços de venda e totais do orçamento.

### 14.3 Decisão de orçamento

**Rota:** `POST /api/me/quotes/:quoteId/decisions`

O verbo e o plural seguem o padrão já estabelecido no projeto para sub-recursos de ação (`POST /quotes/:id/submissions`).

Entrada:

```json
{
  "action": "APPROVE",
  "reason": null
}
```

Regras:

- `action` reutiliza `QuoteDecisionAction` e aceita somente `APPROVE` ou `REJECT`;
- `reason` é opcional e só é usado na rejeição;
- o orçamento deve pertencer a uma ordem de cliente atualmente vinculado e ativo;
- somente orçamento em estado decidível pode ser decidido;
- os use cases atuais de aprovação e rejeição, com suas transações de estoque e ordem, deverão ser reutilizados;
- o `sub` do usuário externo será registrado no histórico como autor;
- se vários representantes possuírem acesso, qualquer um poderá decidir; a primeira decisão válida encerra o estado e as seguintes falham pela regra de domínio.

## 15. E-mails

### 15.1 Nova conta

Quando uma operação criar um usuário, a aplicação enviará nome de acesso e senha inicial ao `User.email`. Se o usuário já existir, a senha não será redefinida; poderá ser enviado apenas um aviso de novo vínculo.

### 15.2 Reset

O código de reset será enviado ao `User.email`, independentemente de o usuário ser interno, externo ou possuir ambos os acessos.

### 15.3 Orçamento

Ao submeter um orçamento:

- enviar notificação aos e-mails dos usuários ativos vinculados ao cliente, sem duplicatas;
- se não houver usuário vinculado, notificar o e-mail comercial do cliente e orientar que o acesso seja solicitado à oficina;
- informar número da ordem, valor e identificador do orçamento;
- orientar autenticação por CPF e senha;
- **não incluir token de decisão nem qualquer link que execute alteração por `GET`.**

## 16. Matriz de acesso

### 16.1 Por rota

| Rota | Público | Externo | ATTENDANT | MECHANIC | ADMIN |
| --- | :-: | :-: | :-: | :-: | :-: |
| `POST /api/auth/login` | ● | — | — | — | — |
| `POST /api/auth/refresh` | ● | — | — | — | — |
| `POST /api/auth/password-reset-confirmations` | ● | — | — | — | — |
| `POST /customer-auth/login` *(diferido)* | ● | — | — | — | — |
| `GET /api/health/live` · `/ready` | ● | — | — | — | — |
| `GET /api/docs` · `/docs-json` | ● | — | — | — | — |
| `GET /api/me` · `PATCH /api/me/password` | — | ● | ● | ● | ● |
| `GET /api/me/work-orders` · `/quotes` · `POST .../decisions` | — | ● | — | — | — |
| `GET /api/users/*` · `POST /api/users` | — | — | — | — | ● |
| `POST /api/users/:id/password-resets` | — | — | — | — | ● |
| `GET /api/users/:id/customers` | — | — | ● | — | ● |
| `/api/customers/*` · `/api/customers/:id/vehicles` | — | — | ● | — | ● |
| `/api/customers/:id/access-users` (GET · POST · DELETE) | — | — | ● | — | ● |
| `PATCH /api/customers/:id/status` | — | — | ● | — | ● |
| `/api/vehicles/*` | — | — | ● | — | ● |
| `/api/work-orders/*` (inclui `POST`) | — | — | ● | ● | ● |
| `/api/quotes/*` (gestão) | — | — | ● | ● | ● |
| `/api/stock-movements` · `/api/stock-reservations` | — | — | ● | — | ● |
| `GET /api/services` · `GET /api/parts-supplies` | — | — | ● | ● | ● |
| Escrita em `/api/services` · `/api/parts-supplies` · `/api/services-metrics` | — | — | — | — | ● |

### 16.2 Por operação

| Operação | Público | Usuário externo | Atendente | Mecânico | Admin |
| --- | :-: | :-: | :-: | :-: | :-: |
| Health check e Swagger | Sim | Sim | Sim | Sim | Sim |
| Login interno | Sim | Sim | Sim | Sim | Sim |
| Login externo | Sim | Sim | Sim | Sim | Sim |
| Confirmar reset com código | Sim | Sim | Sim | Sim | Sim |
| Consultar a própria identidade e trocar a própria senha | Não | Sim | Sim | Sim | Sim |
| Criar, listar e alterar clientes | Não | Não | Sim | Não | Sim |
| Conceder, listar e remover acesso de cliente | Não | Não | Sim | Não | Sim |
| Emitir código de reset | Não | Não | Não | Não | Sim |
| Consultar ordens e orçamentos dos clientes vinculados | Não | Somente vinculados | Pelas rotas internas | Pelas rotas internas | Pelas rotas internas |
| Aprovar ou rejeitar orçamento | Não | Somente vinculado | Pela rota interna | Pela rota interna | Pela rota interna |
| Criar ordem de serviço | Não | Não | Sim | Não | Sim |

Webhooks, caso existam, permanecerão fora desses dois fluxos e deverão possuir validação própria.

O `POST /api/work-orders`, citado nominalmente pelo enunciado como rota que precisa ser protegida, **já** exigia `ADMIN` ou `ATTENDANT` antes desta mudança. A superfície pública existente — autenticação, health check e Swagger — já corresponde ao que o enunciado autoriza; esta entrega apenas acrescenta rotas autenticadas e remove uma pública.

## 17. Erros e segurança

- `401 Unauthorized`: credencial ausente, inválida, expirada ou usuário inativo;
- `403 Forbidden`: identidade válida, mas perfil global não permite a operação administrativa;
- `404 Not Found`: recurso inexistente ou fora do escopo externo;
- `409 Conflict`: CPF/e-mail já pertencem a identidades diferentes, ou vínculo já existe;
- `422 Unprocessable Entity`: regra de domínio ou transição inválida, inclusive cliente inativo;
- `500/503`: erro interno ou dependência indisponível, sem vazamento de detalhes.

Controles obrigatórios:

- senhas sempre com bcrypt;
- código de reset armazenado como hash;
- comparação segura e mensagens genéricas de autenticação e reset;
- algoritmo JWT fixado por estratégia, sem aceitar valor arbitrário do cabeçalho;
- emissor e audiência distintos e verificados por fluxo;
- estratégias separadas para os dois fluxos, sem verificador que aceite ambos os algoritmos;
- chave privada e credencial de banco fora do código e dos logs;
- CPF, senha, hashes, códigos e JWTs tratados como dados sensíveis;
- auditoria de concessão e remoção de acesso, reset e decisão de orçamento;
- consultas parametrizadas pelo ORM;
- proteção contra mass assignment nos DTOs administrativos.

### 17.1 Risco residual por ausência de limitação de frequência

Limitação de frequência está fora de escopo (seção 4). O projeto não possui limitador hoje, e adicioná-lo implicaria nova dependência e decisão sobre armazenamento compartilhado entre réplicas, dado que o HPA está ativo.

O risco é menor do que a existência de um endpoint público com segredo de seis dígitos sugere, porque **apenas um administrador emite códigos**. Um atacante não consegue produzir códigos e fica limitado a cinco tentativas em 10⁶ combinações por código emitido, dentro de uma janela de dez minutos.

O que permanece exposto é o `POST /api/auth/login` a força bruta — comportamento já existente, não introduzido por esta mudança. Ambos os pontos devem constar em `docs/security.md`.

## 18. Observabilidade e logging

### 18.1 O catálogo de logging é fechado

Este projeto **não emite log com campo arbitrário**. `normalizeLogRecord` descarta toda chave que o dicionário não declara, e o dicionário é derivado do registro de campos. Um campo não declarado desaparece **sem exceção, sem erro e sem teste vermelho**.

Cada atributo novo exige entrada em dois arquivos:

- `app/src/application/logging/log-field.ts` — o nome lógico;
- `app/src/infrastructure/logging/field-registry.ts` — chave física, tipo, cardinalidade, dono e sensibilidade.

Também não é possível declarar campos por precaução: `field-registry.spec.ts` possui asserção de tipo que falha quando um campo declarado não é emitido por evento algum.

Declarar `sensitivity: 'pii'` no registro faz o adaptador mascarar o valor sem código no ponto de chamada. É assim que o CPF fica protegido — nunca mascarando na chamada.

### 18.2 Campos lógicos

Reaproveitados do vocabulário existente: `subjectId`, `subjectName`, `subjectEmail`, `failureReason`, `targetUserId`, `targetUserActive`, `quoteId`, `workOrderId`, `workOrderNumber`, `previousQuoteStatus`.

A criar:

| Nome lógico | Tipo | Sensibilidade | Usado por |
| --- | --- | --- | --- |
| `customerId` | string | none | escopo externo, concessão, decisão |
| `customerActive` | boolean | none | mudança de estado do cliente |
| `accessUserCreated` | boolean | none | concessão de acesso |
| `initialPasswordSent` | boolean | none | concessão e criação de usuário |
| `passwordResetOutcome` | string | none | emissão e consumo de código |
| `externalAccessFailureReason` | string | none | recusa de acesso externo |

Nenhum campo carregará CPF, senha, código, hash ou token. `subjectEmail` já é declarado como `pii` e mascarado.

### 18.3 Eventos

| Evento | Emissor | Campos |
| --- | --- | --- |
| `customer.access.granted` | use case de concessão | `subjectId`, `targetUserId`, `customerId`, `accessUserCreated`, `initialPasswordSent` |
| `customer.access.revoked` | use case de remoção | `subjectId`, `targetUserId`, `customerId` |
| `customer.status.updated` | use case de estado | `subjectId`, `customerId`, `customerActive` |
| `user.password.changed` | use case de troca | `subjectId` |
| `user.password_reset.issued` | use case de emissão | `subjectId`, `targetUserId` |
| `user.password_reset.completed` | use case de confirmação | `targetUserId`, `passwordResetOutcome` |
| `user.password_reset.rejected` | use case de confirmação | `passwordResetOutcome` |
| `portal.access.denied` | política de acesso externo | `subjectId`, `customerId`, `externalAccessFailureReason` |
| `quote.approved` · `quote.rejected` | use cases existentes | acrescentar `customerId` |

Eventos transacionais são emitidos **após o commit**, retornando um composto do callback do `$transaction` — nunca de dentro dele.

A autenticação externa em si é registrada pela função serverless, no repositório dela, e não gera evento na API.

Nunca registrar corpo bruto de login, cabeçalho `Authorization`, senha, hash, código, chave ou JWT.

## 19. Documentação

As alterações abaixo integram a documentação do projeto como descrição do estado atual, não como registro de mudança.

| Artefato | Conteúdo |
| --- | --- |
| `README.md` | Os dois fluxos de autenticação, a matriz de rotas por perfil (seção 16.1) e a menção ao repositório da função quando ele existir. É o item que o enunciado destaca como mais importante. |
| `docs/adr/0004-autenticacao-de-clientes.md` | Novo. Identidade separada da parte comercial; role opcional em vez de perfil `CUSTOMER`; duas estratégias em vez de verificador com dois algoritmos; função autônoma e não proxy; RS256; CPF como identificador e senha como credencial; reset por código; remoção do `GET` público; riscos aceitos da seção 25. |
| `docs/api.md` | Rotas novas, `GET /auth/me` → `GET /me`, remoção do `GET /quotes/:id/decisions`, novo comportamento de `POST /users` e `POST /customers`. |
| `docs/architecture.md` | Separação identidade × parte comercial, o vínculo, a resolução de escopo por requisição e a política de acesso na camada de aplicação. |
| `docs/security.md` | Superfície pública revisada, modelo de ameaça dos dois tokens, risco residual sem limitação de frequência (17.1) e sessões não revogadas (10.3). |
| `docs/testing.md` | Assinatura de token de teste para os E2E externos e a segunda passada do ZAP. |
| `docs/infra/kubernetes.md` | `CUSTOMER_JWT_PUBLIC_KEY` no `01-api-secret.yaml`. |
| `docs/infra/ci-cd.md` | A segunda passada do ZAP no `dast.yml`. |
| `docs/c4/` | Ator externo e, quando a função existir, o novo container. |
| `collections/oficina-collection.json` | Fluxo do usuário externo e as rotas novas. |

## 20. Testes obrigatórios

### 20.1 Unitários

- normalização e validação de CPF;
- criação de usuário externo sem role interna;
- concessão para pessoa física com CPF coincidente e rejeição com CPF divergente;
- criação e reutilização de representante de empresa;
- conflito quando CPF e e-mail apontam para usuários diferentes;
- usuário com vínculo individual e múltiplos vínculos empresariais;
- remoção de vínculo sem remoção do usuário;
- política de acesso por `customerId`;
- recusa de cadastro de veículo e de abertura de ordem para cliente inativo;
- emissão, substituição, expiração, contagem de tentativas e consumo único do código;
- alteração autenticada da senha;
- separação das estratégias JWT: token interno recusado pela externa e vice-versa;
- `authFlow` do principal atribuído pela estratégia, não lido do token;
- presenter externo sem campos internos;
- `GET /api/me` com role nula, com `customers` vazio, e com ambos preenchidos.

### 20.2 E2E da API com PostgreSQL real

- login e autorização de funcionários continuam funcionando;
- token externo válido, assinado com a chave de teste, acessa somente as rotas `/api/me/*` externas;
- token interno não substitui token externo nessas rotas, e token externo não acessa rotas internas;
- usuário lista ordens de dois ou mais clientes vinculados, e o filtro `customerId` não escapa do escopo;
- usuário acessa o próprio cliente pessoa física e a empresa representada;
- acesso cruzado a ordem ou orçamento não vinculado retorna `404`;
- remoção de vínculo bloqueia imediatamente o recurso com o mesmo JWT;
- desativação do cliente bloqueia imediatamente o recurso;
- aprovação e rejeição externas verificam propriedade e transição válida;
- concorrência de duas decisões permite somente uma transição;
- reset correto altera senha e invalida o código; quinta tentativa errada invalida; novo código invalida o anterior;
- alteração e reset de senha não revogam tokens existentes, documentando o comportamento aceito;
- `POST /customers` com `createAccess` verdadeiro cria cliente, usuário e vínculo; com falso, apenas o cliente; com `COMPANY` e verdadeiro, erro de validação.

### 20.3 Varredura de segurança (DAST)

O `dast.yml` autentica com `POST /api/auth/login` e injeta esse Bearer em todas as requisições do ZAP. Como o token interno é deliberadamente recusado nas rotas externas, elas ficariam sem cobertura — numa superfície nova e sensível, com job bloqueante.

A solução não depende da função serverless:

1. o job gera um par RS256 efêmero (`openssl genpkey`);
2. a chave pública entra como variável do serviço `api` no compose;
3. um script curto assina um token para o cliente semeado;
4. o `zap-api-scan.py` roda uma **segunda passada** com esse Bearer;
5. os dois relatórios são anexados ao run.

Quando a função existir, nada muda: o emissor real usa a chave de produção e o CI continua com a sua.

### 20.4 Integração da função *(diferido)*

Quando a função for implementada: execução contra PostgreSQL de teste com o schema real; usuário inexistente, inativo, senha incorreta, sem vínculo e apenas com cliente inativo retornando o mesmo `401`; token com apenas as claims aprovadas; API aceitando token assinado pela chave de teste e rejeitando algoritmo, emissor, audiência, assinatura ou expiração incorretos.

## 21. Implantação e compatibilidade

Ordem recomendada:

1. gerar o par RS256 e publicar a chave pública como segredo do cluster;
2. aplicar a migração aditiva — CPF opcional, role opcional, estado do cliente, `user_customers` e `password_reset_codes`;
3. implantar a API com administração de vínculos, validação do token externo, rotas `/api/me` e as novas regras de estado do cliente;
4. ajustar o seed para a demonstração;
5. alterar o e-mail de orçamento para o novo fluxo;
6. remover o endpoint público de decisão e o segredo dedicado antigo;
7. atualizar README, Swagger, collection, C4 e a documentação de segurança e infraestrutura;
8. *(futuro)* implantar a função serverless, sua infraestrutura e a segunda passada do ZAP contra o emissor real.

A remoção do endpoint antigo invalida links de decisão enviados anteriormente. O corte deve ocorrer junto com a alteração do e-mail, no mesmo deploy.

### 21.1 Seed

O seed passará a preparar o roteiro de demonstração em um comando: um cliente `INDIVIDUAL` com acesso concedido, um cliente `COMPANY` com um operador vinculado, e uma ordem com orçamento em estado decidível. Sem isso, cada demonstração e cada E2E monta o cenário à mão.

### 21.2 Desenvolvimento local

O `docker-compose.yml` não muda. O fluxo externo é exercitado localmente com o mesmo mecanismo dos testes: par de chaves de teste, token RS256 assinado por script, chave pública na variável de ambiente da API. A função serverless não sobe localmente.

## 22. Variáveis e segredos

### 22.1 API principal

- `CUSTOMER_JWT_PUBLIC_KEY`
- `CUSTOMER_JWT_ISSUER=oficina-customer-auth`
- `CUSTOMER_JWT_AUDIENCE=oficina-api`
- configuração de expiração interna existente, acrescida de emissor e audiência internos explícitos;
- configurações SMTP e bcrypt existentes.

`QUOTE_DECISION_TOKEN_SECRET` é **removida** junto com o endpoint público de decisão.

### 22.2 Função serverless *(diferido)*

- identificador do segredo de conexão ao banco;
- identificador da chave privada JWT;
- endpoint do banco;
- `CUSTOMER_JWT_ISSUER=oficina-customer-auth`;
- `CUSTOMER_JWT_AUDIENCE=oficina-api`;
- `CUSTOMER_JWT_TTL_SECONDS=3600`.

Nenhum segredo real será commitado em `.env`, manifesto Kubernetes, template de infraestrutura ou fixture de teste.

## 23. Impacto esperado no código

### Domínio

- CPF como conceito validado e normalizado em `User`;
- `User` com CPF opcional e role interna opcional;
- `Customer` com estado ativo e as regras que dele decorrem;
- entidade e regras de vínculo `UserCustomer`;
- regras do código de reset.

### Aplicação

- casos de uso para conceder, listar (nos dois sentidos) e remover acesso;
- caso de uso para alterar estado do cliente;
- casos de uso de alteração e reset de senha;
- política reutilizável de acesso a cliente;
- consultas externas filtradas no banco;
- decisão externa de orçamento reutilizando aprovação e rejeição existentes;
- notificações de nova conta, novo vínculo, reset e orçamento;
- novos eventos e campos no catálogo de logging de negócio.

### Infraestrutura e adaptadores

- migração e repositórios Prisma;
- estratégia e guard `customer-jwt`, e o principal como união discriminada;
- controllers, DTOs, presenters e Swagger das rotas `/api/me`;
- remoção do controller e do use case da decisão pública por `GET`;
- entradas novas em `log-field.ts` e `field-registry.ts`;
- `CUSTOMER_JWT_PUBLIC_KEY` no manifesto de segredo e no `cd.yml`;
- segunda passada do ZAP no `dast.yml`.

## 24. Critérios de aceite

A entrega estará funcionalmente concluída quando:

1. nenhum CPF sozinho autenticar uma pessoa;
2. pessoa jurídica não possuir credenciais nem autenticar por CNPJ;
3. a API verificar token externo RS256 sem possuir a chave privada;
4. funcionários continuarem autenticando por e-mail e senha;
5. usuário puramente externo não acessar endpoints internos, e token interno não acessar as rotas externas;
6. um usuário puder acessar o próprio cliente e várias empresas vinculadas;
7. remover vínculo ou desativar cliente impedir acesso imediatamente;
8. consulta e decisão de orçamento verificarem o cliente proprietário;
9. cliente inativo recusar cadastro de veículo, abertura de ordem e concessão de acesso;
10. o endpoint público de decisão por `GET` não existir mais, e o e-mail não conter link que altere estado;
11. a concessão criar ou reutilizar usuário sem duplicá-lo, e `POST /customers` invocar o mesmo caso de uso;
12. senha inicial e código de reset nunca aparecerem em respostas ou logs;
13. códigos expirarem, aceitarem no máximo cinco falhas, substituírem o anterior e funcionarem uma vez;
14. todo campo novo de log estar declarado nos dois arquivos do catálogo e aparecer na saída;
15. os fluxos, rotas e permissões estarem descritos no README e no Swagger;
16. testes unitários, E2E e a segunda passada do ZAP cobrirem o isolamento entre clientes e entre emissores.

## 25. Riscos e limitações aceitos

| Decisão | Risco | Mitigação nesta entrega |
| --- | --- | --- |
| Enviar senha inicial por e-mail | Comprometimento da caixa postal expõe a credencial inicial. | Senha aleatória forte, somente hash armazenado, recomendação de troca e reset administrativo disponível. Diferente do reset, que trafega código de dez minutos e uso único. |
| Não revogar tokens ao trocar senha | Sessão previamente emitida continua válida. | Recarga de `User.isActive` e consulta do vínculo em cada requisição. |
| Sem limitação de frequência | Força bruta no login interno. | Ver 17.1: o reset é protegido pela emissão restrita a admin; o login interno mantém o comportamento já existente. |
| Reset iniciado somente por admin | Usuário depende da oficina quando perde acesso. | Fluxo simples e auditável, aceito pelo escopo. |
| Função consultará o schema compartilhado | Acoplamento ao banco da aplicação. | Migração compatível, consulta mínima, conta somente leitura e testes de integração com o schema real. |
| Sem frontend | O fluxo não possui feedback visual para o cliente. | Demonstração integral por Swagger e Postman, preservando contratos HTTP corretos. |
| Função diferida | O requisito serverless do entregável não está cumprido ao fim desta entrega. | A API já verifica o token externo e nada precisará mudar nela; a seção 11 deixa todas as decisões estruturais tomadas. O trabalho restante é de implementação e infraestrutura. |

### 25.1 Ponto de risco a validar com o professor

O enunciado descreve o fluxo como CPF, consulta de existência e emissão do token — sem senha. Esta especificação acrescenta a senha e mantém todos os passos descritos, sob a leitura de que **"autenticação por CPF" significa CPF como identificador**, e não como credencial, do mesmo modo que qualquer banco brasileiro.

A leitura é defensável e estritamente mais segura, mas **é uma leitura**. É o único ponto de todo o desenho cuja validação depende de terceiro, e custa uma pergunta confirmá-la antes da implementação.

## 26. Referências técnicas

- [AWS Lambda — conexão com Amazon RDS e recomendação de RDS Proxy](https://docs.aws.amazon.com/lambda/latest/dg/configuration-database.html)
- [AWS Lambda — uso do AWS Secrets Manager](https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html)
- [NestJS JWT — configuração e chaves assimétricas](https://github.com/nestjs/jwt/blob/master/_autodocs/configuration.md)
- [Prisma — relações explícitas muitos-para-muitos](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations)
- [RFC 8725 — boas práticas para JWT](https://www.rfc-editor.org/rfc/rfc8725)
- [OWASP — Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [NIST SP 800-63B — códigos de recuperação e limitação de tentativas](https://pages.nist.gov/800-63-4/sp800-63b.html)

## 27. Decisão final

O desenho adotado é: identidade humana em `User` com role interna opcional, cliente comercial em `Customer`, autorização externa em `UserCustomer`, CPF e senha validados por função serverless que consulta o banco diretamente, JWT externo assimétrico verificado por estratégia própria e autorização dinâmica por vínculo a cada requisição.

Esta entrega constrói tudo exceto a função. A API nasce capaz de verificar o token externo, e a seção 11 fixa as decisões estruturais para que a implementação futura seja apenas trabalho, não redesenho.

A estrutura atende ao requisito acadêmico sem duplicar o login interno, sem tratar CNPJ como identidade, sem confundir o representante de uma empresa com a própria empresa e sem transformar um dado público em credencial.
