# ADR 0002: Logging Estruturado em JSON com Nomenclatura OpenTelemetry

## Status

Aceito — 2026-08-22

## Contexto

A aplicação não tinha logging estruturado. O que existia eram cinco chamadas dispersas ao `Logger` do NestJS (`main.ts`, `prisma.service.ts`, `all-exceptions.filter.ts`, `infrastructure-exception.filter.ts` e `mailer-email-sender.service.ts`) emitindo **texto legível** em stdout. Não havia correlação por requisição, access log, redação de dados sensíveis nem qualquer forma de responder "o que aconteceu na requisição X?" depois do fato.

Dois desses cinco pontos eram ativamente nocivos:

- `InfrastructureExceptionFilter` registrava **toda** exceção de infraestrutura em nível `ERROR` com stack trace **antes** de resolver o status. Todo JWT ausente ou inválido (um `401`) virava uma linha de erro — um scanner na API se transformava em tempestade de alertas.
- `MailerEmailSenderService` interpolava o **endereço de e-mail do destinatário** na mensagem, escrevendo dado pessoal no log.

O objetivo estratégico é uma plataforma de observabilidade (Datadog ou New Relic), possivelmente com CloudWatch no caminho, e OpenTelemetry como camada de padronização. Logs são o primeiro pilar. A decisão que efetivamente compra neutralidade de fornecedor não é a biblioteca de logging — é **o que o processo escreve, sob quais nomes de atributo e com quais tipos**.

## Decisão

Adotar **`pino` + `nestjs-pino` + `pino-http`** como dependências diretas, emitindo **JSON em stdout e nada mais**, com nomes e tipos de atributo alinhados às Semantic Conventions do OpenTelemetry.

### O processo escreve JSON em stdout e nada mais

Nenhum `transport` é declarado em código e `pino-pretty` nunca é importado de `src/`. Datadog, New Relic e CloudWatch ingerem o stdout do contêiner via agente, fluent-bit ou awslogs. Manter o caminho de escrita como uma escrita simples em stdout significa: sem worker thread, sem fila, sem transporte de fornecedor na árvore de dependências, e migração de fornecedor vira mudança de infraestrutura.

**O que a escrita síncrona custa, dito sem maquiagem.** O destino é `pino.destination({ dest: 1, sync: true })`, escolhido para não perder as últimas linhas quando o processo morre de repente — crash ou OOM kill do k8s —, que é justamente quando elas importam. O preço é que a escrita **pode** aplicar backpressure: em contêiner o stdout costuma terminar num pipe, e se o coletor travar o `sonic-boom` entra em espera bloqueante e tenta de novo, segurando o event loop. O listener de `error` cobre falha de escrita, **não** bloqueio. No volume desta aplicação — uma linha por requisição — o risco é baixo e o trade-off é aceito conscientemente; num volume maior a decisão deve ser revisitada junto com uma estratégia explícita de flush no encerramento.

**Portabilidade aqui significa um mapeamento padrão, não configuração zero.** Chaves JSON planas chamadas `service.name` são atributos JSON, não um Resource do OpenTelemetry; o Datadog, por exemplo, exige um remapper para tratar `service.name` como seu campo de serviço. A nomenclatura semconv faz desse remapeamento um *mapeamento padrão e documentado* em vez de um pipeline inventado por backend.

**Não existe coletor de logs de aplicação neste repositório hoje** (`infra/aws-base/eks.tf` cobre apenas os logs do control-plane do EKS). Esta mudança faz a aplicação emitir logs corretos; a coleta, o parsing, a promoção de resource, a retenção e o custo pertencem a uma mudança operacional posterior. Dizer isso explicitamente evita a crença falsa de que fazer merge desta mudança coloca os logs em um lugar pesquisável.

### O formato nunca varia por ambiente

A saída legível em desenvolvimento vem de um **pipe**, não de configuração:

```
"start:dev": "nest start --watch | pino-pretty --timestampKey timestamp --messageKey message"
```

`pino-pretty` é `devDependency`, referenciado somente nesse script. Consequências: dev e produção exercitam o mesmo caminho de serialização, então um bug de redação não pode se esconder atrás de um pretty printer; e não há worker de `transport` alterando a semântica de saída do processo.

Essa decisão é carga estrutural para o envelope: o pino lança `option.transport.targets do not allow custom level formatters` quando `formatters.level` é combinado com múltiplos targets de transport. O rótulo textual de `level` **exige** a decisão de não usar transport.

### Envelope: um desvio deliberado

| Chave | Valor |
| --- | --- |
| `timestamp` | ISO-8601 em **UTC** (`Z`) |
| `level` | rótulo textual (`info`, `warn`, `error`) — **não** o nível numérico do pino |
| `message` | texto estável, nunca interpolado com dado de negócio |

Esse é o único ponto em que divergimos do modelo de dados de log do OTel (`Timestamp`/`SeverityText`/`Body`) e dos padrões do pino (`time`/`level` numérico/`msg`), porque nenhum dos dois é o denominador comum que as três plataformas parseiam sem configuração. `Z` é um designador ISO-8601 válido; produzir um offset fixo `-03:00` significaria reimplementar a aritmética de offset do `DateSerializerInterceptor` no caminho mais quente do processo, para uma apresentação que a ferramenta já faz.

### Nomes **e tipos** seguem as Semantic Conventions

Chaves planas com notação pontilhada: `http.request.method`, `http.route`, `http.response.status_code`, `url.path`, `url.scheme`, `url.query` (**string**), `client.address`, `user_agent.original`, `network.protocol.version`, `service.*`, `deployment.environment.name`, `user.id`, `user.roles`, `exception.*`, `error.type`.

Um namespace próprio `oficina.*` cobre apenas o que a convenção não define — `oficina.event.name`, `oficina.http.request.body_json`, `oficina.http.request.body_truncated`, `oficina.http.server.request.duration_ms`, `oficina.error.message` (a semconv **deprecia** `error.message`) e os identificadores de negócio.

Uma chave cujo tipo varia entre registros é pior que um nome proprietário: um armazenamento indexado descarta o campo ou rejeita o evento. Por isso **todo** atributo emitido consta de um dicionário de campos (`infrastructure/logging/field-registry.ts`, derivado do registro de campos lógicos) que fixa nome, tipo, cardinalidade, componente responsável e sensibilidade — e o E2E afirma `Object.keys(linha) ⊆ dicionário` em cada linha capturada, incluindo as do boot.

`exception.cause.*` foi **descartado**: a convenção define apenas `exception.type`, `exception.message` e `exception.stacktrace`, e inventar um sub-namespace recursivo dentro dela é exatamente o que a regra proíbe em outros pontos. Uma causa encadeada é dobrada no `exception.stacktrace`, e seu tipo contribui para o tipo do erro quando é o mais informativo.

### Nenhum identificador de trace enquanto não houver tracing

Emitir `trace_id`/`span_id` vazios ou sintéticos faz o Datadog tentar correlação com um trace que não existe, o que é pior que a ausência do campo. `request.id` permanece um campo próprio, estável e permanentemente nomeado; quando o SDK do OTel injetar ids reais, `request.id` continua sendo a chave de junção e nada precisa ser renomeado.

### Contexto de requisição por `res.locals`, não por `assign()`

Guards rodam **antes** de interceptors no NestJS, então uma requisição recusada por `JwtAuthGuard` ou `RolesGuard` nunca alcança um interceptor. Atributos que cruzam componentes viajam por um **contexto tipado por requisição** em `res.locals`, escrito pelo interceptor e pelos filtros e lido uma única vez no encerramento — não por `PinoLogger.assign()`.

Essa escolha resolve três problemas de uma vez: elimina a dependência de `assignResponse: true`; mantém `assign()` — uma primitiva de contexto do `nestjs-pino` — fora da porta `ILogger`; e, decisivamente, **mantém o autor em um `403`**, onde um autor vinculado ao interceptor estaria ausente exatamente no evento mais digno de auditoria.

### Fronteira de cobertura declarada, não fingida

`pino-http` é instalado como middleware de módulo, e middleware de módulo não é a primeira coisa da cadeia: `NestApplication.init()` registra o body parser **antes** de `registerModules()`, e `setupSwagger(app)` registra handlers do Express à frente de ambos. A cadeia efetiva é `Helmet → CORS → Swagger → body parser → middleware do LoggerModule → router`.

Ficam **fora** da cobertura, por decisão registrada: corpo malformado ou acima do limite (rejeitado pelo parser), preflight de CORS, rotas servidas diretamente pela documentação da API, e requisições recusadas pelo servidor HTTP antes de alcançarem a aplicação. O contrato declara isso em vez de prometer "toda requisição".

**Rejeitado:** montar um `pino-http` cru na instância do Express antes de Helmet/CORS/Swagger/parsers e ligar o `LoggerModule` com `useExisting: true`. Fecharia a lacuna, mas divide a posse do bootstrap e torna `main.ts` sensível à ordem de um jeito que nada garante — mover CORS, Swagger, um parser ou o `init()` regride a cobertura silenciosamente.

**Consequência, e é um benefício:** as probes do k8s batem em `/api/docs`, que pertence ao Swagger, então as ≈13 000 linhas de probe por dia **nunca chegam ao logger**. O problema de ruído que esta mudança originalmente pretendia suprimir não existe sob esse registro, e a maquinaria de supressão foi deletada em vez de construída.

## Alternativas consideradas

### `Logger` do NestJS
Sem saída JSON, sem redação, sem serializers, sem contexto de requisição. Exigiria construir tudo isso à mão.

### `winston` (+ `nest-winston`)
Materialmente mais lento e — decisivamente — seu ecossistema empurra transports de fornecedor (`winston-datadog`, `winston-newrelic`), ou seja, a aplicação escrevendo direto em um fornecedor. Esse é exatamente o acoplamento que esta mudança existe para evitar, e coloca backpressure de rede no caminho da requisição.

### `pino` sozinho, ligado manualmente
Perde o contexto de requisição por `AsyncLocalStorage` do `nestjs-pino`, que é o mecanismo que satisfaz correlação sem poluir assinaturas de método.

### `transport: { target: 'pino-pretty' }` sob `NODE_ENV !== 'production'`
É a receita comum e é uma armadilha de paridade dev/prod. Rejeitada em favor do pipe no `start:dev`.

### Adotar o SDK do OpenTelemetry agora
A nomenclatura semconv já compra a portabilidade; o SDK sem tracing adiciona peso e uma segunda superfície de configuração sem benefício presente.

## Consequências

### Positivas
- Uma linha por evento observável, sem duplicação entre componentes.
- Correlação por `request.id` que alcança um caso de uso sem passar o id por assinaturas.
- O autor sobrevive a uma falha de autorização — o `403` carrega `user.id`.
- Dados sensíveis são classificados por sequência de tokens em qualquer profundidade e em qualquer rota (ver `docs/security.md`).
- O corpo da requisição é capturado **apenas em falha**, sanitizado, como string de tipo estável limitada a 4096 bytes UTF-8.
- Uma falha de logging nunca altera o comportamento da aplicação e nunca reverte uma operação já confirmada.

### Negativas / Trade-offs
- **Os logs não ficam pesquisáveis quando esta mudança entra.** Não existe coletor; esta mudança torna a saída correta para que adicionar um seja um exercício de configuração.
- **O volume é maior que hoje.** Mitigado por: probes de documentação fora da cobertura, nenhum log de query, nenhum corpo em sucesso, uma linha por requisição.
- **Custo e volume não são medidos antes de a mudança entrar.** Aceito: os controles estão no lugar desde o primeiro dia; a medição pertence à plataforma que for adotada.
- **Risco residual de redação.** Um segredo sob um nome inocente, em um formato que nenhum detector reconhece, ainda chega ao log. A proteção é "os detectores declarados", não "nenhum dado sensível jamais".

### Mudança visível ao cliente
Exatamente duas, ambas endurecimento de segurança:

1. `POST /api/auth/refresh` passa a responder `'Refresh token inválido ou expirado'` para as três causas de falha (token inválido, usuário inexistente, usuário desativado). Antes, `'Usuário inválido ou desativado'` revelava se o usuário existia — um oráculo de enumeração.
2. A falha de envio de e-mail passa a responder `'Não foi possível enviar o e-mail.'` sem o endereço do destinatário.

## Referências

- OpenTelemetry Semantic Conventions: https://opentelemetry.io/docs/specs/semconv/
- Documentação do pino: https://getpino.io/
- `nestjs-pino`: https://github.com/iamolegga/nestjs-pino
- Ciclo de vida de requisição do NestJS: https://docs.nestjs.com/faq/request-lifecycle
