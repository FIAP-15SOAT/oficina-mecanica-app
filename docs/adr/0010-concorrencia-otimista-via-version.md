# ADR 0010: Concorrência otimista via coluna `version`

## Status

Aceito — 2026-09-07

## Contexto

Vários agregados do domínio são alvo de atualizações concorrentes plausíveis num cenário real de oficina: duas requisições podem tentar aprovar/rejeitar o mesmo orçamento quase simultaneamente, dois atendentes podem atualizar o status da mesma OS, ou uma reserva de estoque pode colidir com outra baixa da mesma peça. Sem controle de concorrência, a última escrita vence silenciosamente (*lost update*), e o estado do agregado pode ficar inconsistente com o que qualquer um dos dois requisitantes esperava ter causado.

## Decisão

Adicionar uma coluna `version` (Int, iniciando em `1`) em `WorkOrder`, `Quote` e `PartSupply` — os três agregados sujeitos a atualização concorrente pelo mesmo motivo (múltiplos atores operando sobre o mesmo recurso em paralelo). Toda atualização executa `UPDATE ... WHERE id = ? AND version = ?` e incrementa a versão numa só operação atômica. Quando o Prisma retorna `P2025` (nenhum registro casou com o filtro — ou o recurso não existe, ou a versão mudou), a camada de infraestrutura traduz para `ConcurrencyException`, que o filtro de exceções mapeia para **HTTP 409 Conflict**, instruindo o cliente a buscar o estado atual e tentar novamente.

## Alternativas consideradas

### Lock pessimista (`SELECT ... FOR UPDATE`)

Bloquearia a linha durante toda a transação, garantindo que nenhuma outra escrita concorrente pudesse sequer começar. Descartado porque:

- Exige manter a transação (e a conexão de banco) aberta pelo tempo inteiro da operação, incluindo I/O externo dentro da mesma transação em alguns fluxos (ex.: aprovação de orçamento também envia e-mail) — o que aumentaria a janela de bloqueio de linha proporcionalmente à latência de dependências externas.
- O padrão de contenção esperado é baixo (colisões são raras, não o caso comum) — lock pessimista otimiza para o caso raro pagando custo de bloqueio no caso comum, o oposto do que o lock otimista faz.

### Nenhum controle de concorrência (last-write-wins)

Seria o caminho mais simples de implementar. Descartado porque perderia silenciosamente atualizações concorrentes em fluxos onde isso tem consequência de negócio real — por exemplo, dois atendentes aprovando/rejeitando o mesmo orçamento quase ao mesmo tempo, ou duas baixas de estoque da mesma peça colidindo sem que nenhum dos dois lados saiba que a operação do outro também aconteceu.

### `updatedAt` como campo de versão (em vez de um inteiro dedicado)

Usar o timestamp de última atualização como valor de comparação no `WHERE`, evitando uma coluna extra. Descartado porque:

- Timestamps têm resolução limitada e podem colidir em updates muito próximos no tempo (a depender da precisão do relógio do banco/driver), enquanto um inteiro incremental nunca tem ambiguidade.
- Um `version` dedicado comunica intenção explicitamente (é lido pelo próximo desenvolvedor como "isto participa de controle de concorrência otimista"), enquanto reaproveitar `updatedAt` para esse fim mistura uma responsabilidade de auditoria com uma de controle de concorrência.

## Consequências

### Positivas

- **Sem custo de lock durante o caminho feliz**: a maioria das atualizações não colide, e o lock otimista não paga nenhum custo de bloqueio de linha nesse caso comum.
- **Sinal explícito ao cliente**: o 409 diz exatamente o que aconteceu (a versão que o cliente tinha em mãos não é mais a atual) e o que fazer (buscar de novo, tentar de novo) — mais informativo que um `500` genérico ou um `200` que escondeu a perda de dados.
- **Sem infraestrutura adicional**: o mecanismo vive inteiramente no schema (uma coluna) e num `WHERE` — não exige um serviço de coordenação distribuída nem lock distribuído (Redis, etc.), compatível com a decisão de manter o sistema como um monólito com um único banco (ver [ADR 0007](0007-padrao-de-comunicacao-rest-monolito.md)).

### Negativas / Trade-offs

- **Cliente precisa saber lidar com 409**: qualquer chamador da API (front-end, Postman, outro serviço) precisa tratar esse status como "tente de novo com o estado atual", não como um erro definitivo — se não tratar, a operação falha silenciosamente do ponto de vista do usuário final.
- **Não previne a colisão, só a detecta**: duas requisições concorrentes ainda competem; uma delas sempre falha e precisa refazer o trabalho (reler, reaplicar a mudança) — não há fila nem serialização automática das tentativas.
- **Exige disciplina em toda nova mutação do agregado**: qualquer novo caminho de escrita para `WorkOrder`, `Quote` ou `PartSupply` precisa lembrar de incluir `version` no `WHERE` e incrementá-la — esquecer reintroduz o *lost update* que o mecanismo existe para prevenir.

### Riscos mitigados

- **Atualizações concorrentes perdendo dados silenciosamente**: mitigado pelo 409 explícito em vez de a segunda escrita sobrescrever a primeira sem aviso.
- **Estoque reservado/baixado incorretamente por corrida entre aprovação de orçamento e movimentação manual**: mitigado pelo mesmo mecanismo aplicado a `PartSupply`.

## Referências

- [`docs/architecture.md` › Concorrência otimista](../architecture.md#concorrência-otimista)
- [ADR 0011 — Unit of Work para transações multi-repositório](0011-unit-of-work-transacoes-multi-repositorio.md)
