# 🧪 Testes

## Índice

- [Unitários](#unitários)
- [E2E](#e2e)
- [Autenticação externa nos testes (customer-jwt)](#autenticação-externa-nos-testes-customer-jwt)
- [Postman / Newman](#postman--newman)
- [Indisponibilidade de dependência e encerramento gracioso](#indisponibilidade-de-dependência-e-encerramento-gracioso)
- [Cobertura E2E — branches estruturalmente inalcançáveis](#cobertura-e2e--branches-estruturalmente-inalcançáveis)

## Unitários

```bash
npm test          # executa os testes
npm run test:cov  # com relatório de cobertura
```

As suítes cobrem todas as camadas (`application/`, `domain/` — incluindo entidades, value objects e validators —, `interface-adapters/` e `infrastructure/`). Use-cases são instanciados diretamente com mocks do tipo `jest.Mocked<IRepository>` (ou `jest.Mocked<IUnitOfWork>` onde aplicável) — sem NestJS DI, sem banco de dados. Os Clean Controllers são instanciados diretamente com use-cases mockados; a borda HTTP (`@Controller` fino) é exercitada via `jest.spyOn` no Clean Controller real. As factories de mocks (incluindo `UnitOfWorkMockFactory`) estão em `test/helpers/`, organizadas por entidade.

A cobertura é coletada em todo `src/**` (todas as camadas — `domain/`, `application/`, `interface-adapters/` e `infrastructure/`). As exclusões são por sufixo/caminho, não por camada: `*.module.ts`, `main.ts`, `*.enums.ts`, `*.config.ts`, `*.exception.ts`, `*.dto.ts`, `infrastructure/persistence/prisma/prisma.service.ts` e `domain/constants/**` (ver `package.json` → `jest.collectCoverageFrom`). Os arquivos gerados pelo Prisma ficam de fora por viverem em `prisma/generated/`, fora de `src/`.

## E2E

```bash
npm run test:e2e      # executa os testes
npm run test:e2e:cov  # com cobertura
```

13 suites cobrindo todos os domínios (auth, user, customer, vehicle, service, part-supply, work-order, quote, stock) mais `me` (rotas do Cliente da Oficina autenticado), uma suite dedicada ao `AllExceptionsFilter`, outra ao logging estruturado e outra aos endpoints de saúde. Os testes E2E sobem um PostgreSQL real via **Testcontainers** (sem necessidade de banco externo) e usam helpers compartilhados em `test/helpers/` (`test-app.helper.ts`, `auth.helper.ts`, `db-cleanup.helper.ts`) para subir o `INestApplication`, autenticar e limpar o banco entre testes. Configuração em `test/jest-e2e.json` (timeout de 10 minutos para acomodar a inicialização dos containers).

O motivo de testar contra um Postgres real (em vez de mocks Prisma) é validar comportamentos que dependem do banco — constraints de unicidade, cascade deletes, sequences, conversões de tipos, índices e a corrida implícita de updates condicionados (`WHERE version = ?`) — e detectar regressões em migrations.

### Captura de logs no E2E

Não existe `LOG_LEVEL=silent` global: isso silenciaria também a suite de logging que precisa capturar a saída. Os testes unitários ficam quietos por usarem `createMockLogger()` (`test/helpers/logger-mock.factory.ts`); o E2E define destino e nível explicitamente.

`setupTestApp({ captureLogs: true })` injeta um stream de captura na configuração **de produção** do `LoggingModule` e expõe `ctx.logCapture`, com as linhas já parseadas como JSON:

```ts
ctx = await setupTestApp({ captureLogs: true });

await request(ctx.httpServer).get('/api/customers').expect(401);

const [line] = ctx.logCapture!.lines().filter((l) => l.message === 'http request');
expect(line['http.response.status_code']).toBe(401);
```

O seam é real: o `LoggingModule` é configurado com `LoggerModule.forRootAsync` e tokens de DI para o **destino** (`LOGGER_DESTINATION`) e o **nível efetivo** (`LOGGER_LEVEL`), que o helper sobrescreve antes de compilar o módulo. Um `forRoot()` estático não poderia ser redirecionado depois que o `AppModule` já foi importado, e `captureLogs` não capturaria nada. Trocar o módulo inteiro também não serviria — substituiria justamente o middleware e o comportamento de `AsyncLocalStorage` que estão sob teste.

O helper **não** duplica a configuração de bootstrap: ele chama `configureApp()`
(`src/infrastructure/config/app-bootstrap.ts`), a mesma função que o `main.ts` usa.

Duas opções extras, usadas só pela suíte de logging para que as outras onze não paguem o custo:

| Opção | O que liga |
| --- | --- |
| `captureBootstrap` | Implica `captureLogs`, liga `bufferLogs` + `useLogger` e guarda uma fotografia das linhas de boot em `ctx.logCapture.bootstrapLines()` **antes** de o `beforeEach` chamar `clear()`. É o único caminho para o teste do dicionário alcançar as chaves que só aparecem quando o próprio Nest loga. |
| `withSwagger` | Registra o Swagger **antes** do `app.init()`. Sem ele, `/api/docs` é um 404 comum do router e a fronteira D19 não é verificável — era por isso que o teste da fronteira afirmava o oposto do próprio nome. |

Shutdown hooks continuam desligados no E2E: ligá-los acumularia listeners de processo entre as suítes.

## Autenticação externa nos testes (customer-jwt)

A função serverless que emite o token `customer-jwt` (RS256) fica **fora do escopo desta entrega** (ver [ADR 0004](./adr/0004-autenticacao-de-clientes.md)) — não existe ainda um repositório/deploy real para consultar. Para exercitar `/api/me/*` sem depender dela, `test/helpers/customer-jwt.helper.ts` gera um **par de chaves RS256 em tempo de execução** (`generateKeyPairSync`, nunca um PEM comitado no repositório) e expõe `signTestCustomerToken(userId, expiresInSeconds?)`, que assina um token de teste com o mesmo formato de claims que a função serverless deverá emitir (`{ sub: userId }`, `iss`/`aud` fixos, RS256).

`setupTestApp()` (`test/helpers/test-app.helper.ts`) injeta a chave **pública** gerada em `process.env.CUSTOMER_JWT_PUBLIC_KEY` antes de compilar o módulo — o mesmo caminho de configuração (`CustomerJwtStrategy` lendo `CUSTOMER_JWT_PUBLIC_KEY`/`CUSTOMER_JWT_ISSUER`/`CUSTOMER_JWT_AUDIENCE` via `ConfigService`) que roda em produção, só que com uma chave efêmera. Isso mantém o teste fiel à verificação real de assinatura/emissor/audiência, sem exigir a Lambda no ambiente de CI.

```ts
import { signTestCustomerToken } from '../helpers/customer-jwt.helper';

const token = signTestCustomerToken(user.id);
await request(ctx.httpServer)
  .get('/api/me/work-orders')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

`test/e2e/me.e2e-spec.ts` é a suite que exercita esse caminho — identidade externa, troca de senha via `AnyAuthGuard`, listagem/consulta de OS e orçamentos vinculados por `CustomerAccessPolicy`, e decisão de orçamento (aprovação/rejeição) — incluindo o caso de um `sub` sem nenhum vínculo ativo (token assinado para um `userId` aleatório) para confirmar a rejeição em `CustomerJwtStrategy.validate()`.

**Fora do escopo desta entrega — DAST de segunda passagem com o token externo.** O spec (§20.3) prevê que o workflow `dast.yml` gere um par de chaves RS256 efêmero **no próprio job de CI**, injete a chave pública no serviço `api` (substituindo a que a stack já usa para o primeiro passe autenticado como usuário interno) e rode um **segundo** `zap-api-scan.py` autenticado com um Bearer `customer-jwt`, para cobrir `/api/me/*` no scan dinâmico. Isso é uma mudança no **workflow de CI/CD** (`.github/workflows/dast.yml`), não no código da API — está fora do escopo deste plano, que cobre apenas a aplicação. Ver [Infra · CI/CD](infra/ci-cd.md#4-workflow-de-dast-dastyml) para o estado atual do workflow e a referência a este follow-up.

## Postman / Newman

A coleção e o environment estão em `collections/`. Importe `collections/oficina-collection.json` e `collections/oficina-environment.json` no Postman e selecione o environment **"Oficina Mecânica — Local"**.

O environment já vem com `adminEmail` e `adminPassword` preenchidos com um dos usuários do seed; confira/ajuste essas variáveis caso queira autenticar com outro usuário criado pelo seed.

Execute os grupos nesta ordem: **Auth → Usuários → Serviços → Peças e Insumos → Clientes → Acesso Externo de Clientes → Minha Conta → Veículos → Ordens de Serviço → Orçamentos**.

O grupo **Minha Conta** exercita `/api/me/*` com o token externo (`customer-jwt`) e por isso não usa o bearer padrão da collection (`{{authToken}}`) — cada requisição sobrescreve a autenticação para `Bearer {{customerJwtToken}}`. Como a função serverless de emissão ainda não existe (ver [ADR 0004](adr/0004-autenticacao-de-clientes.md)), `customerJwtToken` no `collections/oficina-environment.json` vem **vazio por padrão**: gere um token de teste manualmente (mesmo mecanismo de `test/helpers/customer-jwt.helper.ts`, descrito acima) e preencha a variável do environment antes de rodar esse grupo.

Ou via linha de comando com a aplicação rodando:

```bash
npx newman run collections/oficina-collection.json -e collections/oficina-environment.json
```

## Indisponibilidade de dependência e encerramento gracioso

A suíte `health.e2e-spec.ts` cobre três cenários que exigem manipular a infraestrutura do próprio teste.

**Banco indisponível desde o boot.** Um `describe` sem infraestrutura alguma — sem containers e sem migration — aponta a `DATABASE_URL` para um endereço que recusa a conexão e sobe a aplicação por `configureApp()`, a mesma composição que o `main.ts` usa. Ele assere que a porta **abre**, que `/live` responde `200` e que `/ready` responde `503`: é a propriedade cloud-native de que o `$connect()` do adapter é preguiçoso, da qual o desenho depende sem implementar. Se uma versão futura do adapter passar a validar conectividade no `connect()`, isso viraria `CrashLoopBackOff` em produção — e falha aqui primeiro. O mesmo `describe` assere o **contrato publicado** em `/api/docs-json`: um schema por desfecho, para que o OpenAPI não afirme que `/live` pode responder `unavailable` nem que o `503` pode responder `ok`.

**Dependência fora.** Um `describe` próprio sobe a stack, confirma `/api/health/ready` = `200`, **para o container do PostgreSQL** e então assere `/ready` = `503` **enquanto** `/live` continua `200`. É o teste que carrega o desenho: ele falha no instante em que alguém reintroduzir verificação de banco na vivacidade. `setupTestApp()` sobe um PostgreSQL **dedicado por chamada**, então não há container compartilhado a proteger — mas o teardown é ordenado à mão, porque depois do `stop()` o `app.close()` chama `$disconnect()` contra um servidor morto e essa espera não tem prazo. E como o `stop()` é memoizado pelo testcontainers, um `restart()` **não** é caminho de recuperação: a transição de volta para saudável fica coberta pelo unitário do detector, não pelo E2E.

**Os dois testes de encerramento protegem coisas diferentes, e isso importa.**

| Teste | O que prova |
|---|---|
| `/ready` = `503` e `/live` = `200` durante a janela de `close('SIGTERM')` | O **contrato de saúde** no encerramento |
| Requisição de negócio em voo que usa o banco **conclui com sucesso** durante a janela | A **ordem de liberação dos recursos** |

O primeiro **não** substitui o segundo, e é essa a armadilha: se o `$disconnect()` migrasse para `onModuleDestroy`, `/ready` responderia `503` pelo estado de `draining` e `/live` responderia `200` de qualquer forma — os dois status passariam e a regressão ficaria invisível. Quem a pega é a requisição em voo, que roda com `app.listen(0)`, é segurada por um gate no acesso ao banco e só executa a consulta **depois** de o encerramento começar. Somam-se a ela dois unitários: o de `PrismaService`, que assere que o `$disconnect()` não está em `onModuleDestroy` e está em `onApplicationShutdown`, e o de `ReadinessState`, que assere que um `close()` **sem sinal** marca `draining` e não sustenta a janela.

O drain **é** alcançável neste harness: `enableShutdownHooks()` apenas registra listeners de sinais do processo, e `close(signal)` executa os hooks de qualquer forma — o servidor HTTP só fecha no `dispose()`, depois da janela. Por isso ele não aparece na lista de branches inalcançáveis abaixo. A janela, porém, só é sustentada no ambiente orquestrado (`NODE_ENV=production`), então o `describe` de encerramento declara esse ambiente no `beforeEach` e o restaura depois — é o que faz a suíte exercitar o comportamento real em vez de um caminho de teste próprio.

As três `describe`s esperam a prontidão assentar em `200` antes de assertar o contrato. A primeira verificação depois do boot paga TCP + autenticação com o pool ainda vazio, e o prazo próprio do chamador é de 3,5 s — o `query_timeout` de 2 s vale só para a consulta e não cobre a aquisição da conexão: com doze suítes E2E em paralelo, cada uma subindo os próprios containers, esse caso frio estoura o prazo e a prontidão responde `503` uma vez — exatamente como responderia em produção antes de o `failureThreshold` ser atingido. A propriedade continua asserida (se a prontidão nunca ficar `200`, a suíte falha); o que a espera remove é a dependência de uma única amostra fria sob inanição de CPU.

**Asserções de log.** Com `setupTestApp({ captureLogs: true })`, a suíte assere que uma probe saudável produz **zero** linhas de access log; que uma probe que falha produz **exatamente uma**, em `error`, **sem** stack trace e **sem** `error.type`/`oficina.error.message` (a resposta é deliberada e não lança, então não há exceção resolvida de onde derivá-los); e que a transição emite exatamente um `health.degraded` com a categoria da causa. Fecha com uma asserção **negativa**: o corpo do `503` não contém host, porta, cadeia de conexão nem stack.

## Cobertura E2E — branches estruturalmente inalcançáveis

Alguns branches (`?`, `??`, `?.`) nos Presenters (`interface-adapters/`) e na borda HTTP (`infrastructure/http/`) não podem ser cobertos pelos testes E2E. Isso ocorre por design da infraestrutura (JOINs obrigatórios via Prisma `include`) ou por invariantes do domínio (FKs NOT NULL, autenticação JWT). Abaixo, cada caso é documentado com a justificativa.

### `src/interface-adapters/stock/stock.presenter.ts`

| Localização | Branch não coberto | Motivo |
|---|---|---|
| `mapWorkOrderData` — `wo.assignedUser ? ... : null` | Ramo falso (`null`) coberto, ramo verdadeiro depende de cenário com mecânico atribuído | OS sem mecânico atribuído é o caso comum; o JOIN `assignedUser` é opcional na tabela. |
| `toStockMovementResponse` — `item.workOrder ? ... : null` | Ramo verdadeiro/falso conforme tipo de movimento | Movimentações automáticas têm `workOrderId`; manuais podem ter `null`. |

### `src/interface-adapters/work-order/work-order.presenter.ts`

| Localização | Branch não coberto | Motivo |
|---|---|---|
| `toStatusHistoryListResponse` — `entry.changedBy ? ... : null` | Ramo falso (`null`) | O histórico de status iniciado por usuário autenticado sempre persiste `changedById`. Apenas eventos automáticos disparados sem usuário (ex.: envio de orçamento via job interno) registram `null`. |

### `src/infrastructure/http/controllers/quote/quote.module.ts`

| Localização | Branch não coberto | Motivo |
|---|---|---|
| Configuração de `PORT` — `process.env.PORT ?? '3000'` | Ramo direito (`'3000'`) | O arquivo `.env` sempre define `PORT=3000`. Os testes E2E carregam esse arquivo via `ConfigService`, portanto `process.env.PORT` nunca é `undefined` em tempo de execução dos testes. |

> A lista é mantida em sincronia com a implementação atual dos presenters. Branches que dependem de relações obrigatórias (FKs NOT NULL com `include` mandatório) são afirmados com `!` em vez de fallback `??` / `?.`, eliminando o branch antes mesmo de ser gerado.
