# 🧪 Testes

## Índice

- [Unitários](#unitários)
- [E2E](#e2e)
- [Postman / Newman](#postman--newman)
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

11 suites cobrindo todos os domínios (auth, user, customer, vehicle, service, part-supply, work-order, quote, stock) mais uma suite dedicada ao `AllExceptionsFilter` e outra ao logging estruturado. Os testes E2E sobem um PostgreSQL real via **Testcontainers** (sem necessidade de banco externo) e usam helpers compartilhados em `test/helpers/` (`test-app.helper.ts`, `auth.helper.ts`, `db-cleanup.helper.ts`) para subir o `INestApplication`, autenticar e limpar o banco entre testes. Configuração em `test/jest-e2e.json` (timeout de 10 minutos para acomodar a inicialização dos containers).

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
(`src/config/app-bootstrap.ts`), a mesma função que o `main.ts` usa.

Duas opções extras, usadas só pela suíte de logging para que as outras dez não paguem o custo:

| Opção | O que liga |
| --- | --- |
| `captureBootstrap` | Implica `captureLogs`, liga `bufferLogs` + `useLogger` e guarda uma fotografia das linhas de boot em `ctx.logCapture.bootstrapLines()` **antes** de o `beforeEach` chamar `clear()`. É o único caminho para o teste do dicionário alcançar as chaves que só aparecem quando o próprio Nest loga. |
| `withSwagger` | Registra o Swagger **antes** do `app.init()`. Sem ele, `/api/docs` é um 404 comum do router e a fronteira D19 não é verificável — era por isso que o teste da fronteira afirmava o oposto do próprio nome. |

Shutdown hooks continuam desligados no E2E: ligá-los acumularia listeners de processo entre as suítes.

## Postman / Newman

A coleção e o environment estão em `collections/`. Importe `collections/oficina-collection.json` e `collections/oficina-environment.json` no Postman e selecione o environment **"Oficina Mecânica — Local"**.

O environment já vem com `adminEmail` e `adminPassword` preenchidos com um dos usuários do seed; confira/ajuste essas variáveis caso queira autenticar com outro usuário criado pelo seed.

Execute os grupos nesta ordem: **Auth → Usuários → Serviços → Peças e Insumos → Clientes → Veículos → Ordens de Serviço → Orçamentos**.

Ou via linha de comando com a aplicação rodando:

```bash
npx newman run collections/oficina-collection.json -e collections/oficina-environment.json
```

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
