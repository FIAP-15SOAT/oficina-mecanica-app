# ADR 0017: Ausência de rate limiting no login interno — risco aceito, não ausência acidental

## Status

Aceito — 2026-09-07

## Contexto

`docs/security.md` já lista, na seção de riscos residuais aceitos: "Não há limitação de frequência de requisições no login interno (`POST /api/auth/login`) nesta entrega — risco preexistente, não introduzido pela autenticação externa de clientes." Até aqui, essa é uma anotação de risco, não uma decisão revisável — não há registro de quais alternativas de rate limiting foram avaliadas nem por que foram adiadas. Esta ADR promove essa anotação a uma decisão explícita, para que a ausência de rate limiting seja um trade-off consciente e revisável, não um detalhe que se perde numa lista de riscos.

O `POST /api/auth/login` retorna a mesma mensagem genérica ("Credenciais inválidas") para todos os quatro caminhos de falha (usuário inexistente, inativo, senha incorreta, sem role interna) — ver ADR 0012 —, o que já elimina o oráculo de enumeração de contas por conteúdo de resposta. O que continua em aberto é a possibilidade de um cliente enviar um volume arbitrário de tentativas de login por unidade de tempo, sem nenhum teto.

## Decisão

**Não implementar rate limiting no login (nem em nenhuma outra rota) nesta entrega**, aceitando o risco de força bruta por volume de tentativas como residual, documentado e monitorável — não coberto por controle automático.

## Alternativas consideradas

### `@nestjs/throttler` (rate limiting em nível de aplicação)

Adicionaria um teto de requisições por IP/rota diretamente na aplicação, com pouca fricção de implementação (guard global ou por rota). Descartado nesta entrega porque exigiria decidir uma política de janela/teto sem dado real de tráfego de produção para calibrar (um teto agressivo demais gera falsos positivos para usuários legítimos atrás de NAT/proxy corporativo; um teto frouxo demais não mitiga o risco) — e o node group fixo em 1 réplica mínima (ADR 0008) tornaria um contador em memória por instância inconsistente assim que o HPA escalar para múltiplas réplicas, exigindo um armazenamento compartilhado (Redis) que o projeto não tem hoje.

### Rate limiting na borda (API Gateway / WAF)

Deslocaria a responsabilidade para fora da aplicação, na camada de infraestrutura (ex.: AWS WAF com regra de taxa, ou um API Gateway na frente do Load Balancer). Descartado nesta entrega porque não há API Gateway nem WAF provisionado na infraestrutura atual (ver `oficina-mecanica-infra-base`) — adicioná-lo só para este fim estenderia o escopo de infraestrutura além do que o orçamento de laboratório AWS Academy comporta.

### Bloqueio de conta após N tentativas falhas (lockout)

Bloquearia a conta do próprio usuário após um número de tentativas incorretas, análogo ao mecanismo já existente para o código de redefinição de senha (5 tentativas em 10 minutos). Descartado para o login porque criaria uma superfície de negação de serviço direcionada: um atacante que conheça o e-mail de um usuário legítimo poderia bloqueá-lo deliberadamente enviando tentativas incorretas repetidas — um trade-off pior do que o risco que se pretende mitigar.

## Consequências

### Positivas

- **Decisão explícita e revisável**: o adiamento do rate limiting deixa de ser um detalhe implícito em uma lista de riscos e passa a ser uma decisão registrada, com as alternativas já avaliadas e descartadas — uma futura reavaliação não recomeça do zero.
- **Sem complexidade adicional de infraestrutura compartilhada** (Redis, WAF) nesta fase, mantendo o escopo de infraestrutura dentro do orçamento de laboratório.

### Negativas / Trade-offs

- **Sem defesa automática contra força bruta por volume**: um atacante pode enviar um número arbitrário de tentativas de login por unidade de tempo sem ser bloqueado automaticamente — o único controle hoje é a mensagem de erro genérica (não revela qual dado está errado), não um teto de tentativas.
- **Dependência de monitoração externa para detectar abuso**: sem um contador de tentativas, identificar um ataque de força bruta em andamento depende de observabilidade (logs, métricas) sendo ativamente monitorada, não de um bloqueio automático.

### Riscos aceitos

- **Força bruta de credenciais por volume de tentativas no login**: aceito nesta entrega. Mitigação futura recomendada: `@nestjs/throttler` com armazenamento compartilhado (Redis) assim que o HPA escalar para múltiplas réplicas, ou rate limiting na borda caso um API Gateway/WAF seja adicionado à infraestrutura.

## Referências

- [`docs/security.md`](../security.md) — riscos residuais aceitos.
- [ADR 0012 — Autenticação interna via JWT stateless](0012-autenticacao-interna-jwt-stateless.md) — mensagem de erro unificada no login.
- [ADR 0008 — Autoscaling via HPA](0008-autoscaling-via-hpa.md) — por que um contador em memória por instância não seria confiável sob múltiplas réplicas.
