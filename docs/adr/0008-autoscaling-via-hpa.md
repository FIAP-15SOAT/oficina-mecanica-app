# ADR 0008: Autoscaling via HPA de pods, não autoscaling de cluster

## Status

Aceito — 2026-09-07

## Contexto

O enunciado da Fase 2 do desafio exige explicitamente "Horizontal Pod Autoscaler (HPA)" na orquestração em Kubernetes, para sustentar "grandes volumes de ordens de serviço em horários de pico, com escalabilidade dinâmica". O ambiente de execução é o cluster EKS do `prod-simulated` em conta AWS Academy, com orçamento de laboratório limitado (ver [ADR 0006](0006-escolha-de-nuvem-aws.md)) — o node group é mantido fixo em 1 nó por decisão consciente de custo, não por limitação técnica do HPA em si. O tipo de instância do node (`t3.medium`) foi dimensionado especificamente em função do teto de pods por node exigido pelo `maxReplicas` deste HPA — ver [`oficina-mecanica-k8s` › ADR 0001](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s/blob/main/docs/adr/0001-suporte-a-hpa-e-dimensionamento-do-node-group.md), que documenta esse cálculo de capacidade.

## Decisão

Escalar a **API horizontalmente por pod**, via `HorizontalPodAutoscaler` (`autoscaling/v2`), com:

- `minReplicas: 1`, `maxReplicas: 5`.
- Duas métricas de recurso: CPU (`averageUtilization: 70`) e memória (`averageUtilization: 80`) — o HPA escala quando **qualquer uma** das duas ultrapassa o alvo.
- Métricas fornecidas pelo `metrics-server` (Helm, provisionado junto da plataforma Kubernetes).

O **node group do cluster permanece fixo em 1** (`desired = min = max = 1`) — não há Cluster Autoscaler nem Karpenter. Autoscaling de infraestrutura (nodes) está deliberadamente fora do escopo desta entrega: o requisito do desafio é escalar os pods da aplicação, não a capacidade do cluster.

## Alternativas consideradas

### Escala manual (número fixo de réplicas)

Descartada porque o enunciado do desafio exige explicitamente HPA — escalar manualmente não demonstraria a competência de autoscaling dinâmico que a Fase 2 pede, e exigiria intervenção humana em picos de demanda em vez de resposta automática.

### Cluster Autoscaler / Karpenter (autoscaling de nodes)

Escalaria a capacidade do cluster (número de nodes EC2) junto com os pods, dando margem para crescer além do que um único `t3.small` suporta. Descartado porque:

- Fora do escopo definido para esta fase — o requisito é HPA de pods.
- Custaria mais crédito de laboratório AWS Academy (mais nodes EC2 rodando), que já é escasso e consumido majoritariamente pelo control plane do EKS e pelo NAT Gateway (ver [ADR 0006](0006-escolha-de-nuvem-aws.md)).
- Neste laboratório, o teto prático de 5 réplicas da API já é validado sob carga sem exceder a capacidade do node único, dimensionado especificamente para isso (`t3.medium` — ver [`oficina-mecanica-k8s` › ADR 0001](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s/blob/main/docs/adr/0001-suporte-a-hpa-e-dimensionamento-do-node-group.md)) — não há, hoje, evidência de que a capacidade do node seja o gargalo.

### KEDA (autoscaling orientado a eventos)

Permitiria escalar com base em métricas customizadas (profundidade de fila, taxa de requisições) em vez de apenas CPU/memória. Descartado porque:

- Exigiria instalar e operar um componente adicional (KEDA) no cluster, sem uma métrica de negócio clara que justificasse o ganho sobre CPU/memória neste estágio — não há fila de mensagens no sistema (ver [ADR 0007](0007-padrao-de-comunicacao-rest-monolito.md)) cuja profundidade pudesse alimentar um scaler orientado a eventos.
- O requisito do desafio pede HPA nativo, não uma solução de terceiros.

### Escalar por CPU apenas (sem memória)

Descartada em favor de usar as duas métricas: a API tem picos de uso de memória (processamento de payloads, conexões de banco) que nem sempre correlacionam linearmente com CPU — usar as duas com "escala se qualquer uma ultrapassar o alvo" cobre ambos os padrões de saturação sem exigir uma métrica customizada.

## Consequências

### Positivas

- **Resposta automática a pico de carga**: a API escala de 1 para até 5 réplicas sem intervenção manual, atendendo ao requisito de "escalabilidade dinâmica" da Fase 2.
- **Sem custo de infraestrutura adicional**: escalar pods sobre um node group fixo não aumenta o consumo de crédito de laboratório com novos nodes EC2.
- **Métrica dupla reduz pontos cegos**: CPU e memória cobrem os dois padrões mais comuns de saturação de um processo Node.js sem exigir instrumentação de métrica customizada.

### Negativas / Trade-offs

- **Teto de escala limitado pela capacidade de um único node**: com o node group fixo em 1 node, o HPA não pode escalar além do que aquele node comporta — em produção real, isso exigiria Cluster Autoscaler (ou Karpenter) operando em conjunto com o HPA.
- **"Duas AZs" não é alta disponibilidade real**: mesmo com o HPA escalando pods, com 1 node único todas as réplicas convivem na mesma zona de disponibilidade — não há redundância entre AZs, apenas escala de processos.
- **`averageUtilization` é relativo ao `request`, não ao `limit`**: 70% de CPU é medido sobre os `200m` requisitados, não sobre o teto de `limit` — um ajuste de `requests`/`limits` no futuro precisa reavaliar se os alvos de 70%/80% continuam fazendo sentido.

### Riscos mitigados

- **Indisponibilidade sob pico de demanda**: mitigado pelo HPA reagir automaticamente a CPU ou memória elevadas, evitando que a API fique subdimensionada durante horários de pico sem exigir monitoração manual constante.

## Referências

- [`docs/infra/kubernetes.md` › Autoscaling da API (HPA)](../infra/kubernetes.md#autoscaling-da-api-hpa)
- [`docs/infra/overview.md` › Limitações e o que produção exigiria](../infra/overview.md#limitações-e-o-que-produção-exigiria)
- [ADR 0006 — Escolha de nuvem](0006-escolha-de-nuvem-aws.md)
- [`oficina-mecanica-k8s` › ADR 0001 — Suporte ao HPA da API e dimensionamento do Node Group](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s/blob/main/docs/adr/0001-suporte-a-hpa-e-dimensionamento-do-node-group.md)
