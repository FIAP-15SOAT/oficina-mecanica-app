# 🏗️ Infraestrutura · Visão Geral

Este documento detalha a infraestrutura aplicada no projeto: descreve o deploy em **AWS + Amazon EKS** como um **sistema único** — quais são os componentes, quem provisiona cada um, quem chama quem em tempo de execução e para que serve cada recurso. Os detalhes por ferramenta ficam nos aprofundamentos de [Terraform](terraform.md), [Kubernetes](kubernetes.md) e [CI/CD](ci-cd.md), referenciados ao longo da documentação.

A solução roda inteiramente na região **`us-east-1`**, dentro de uma única VPC, num cluster EKS — com a persistência relacional em **Amazon RDS, fora do cluster** —, autoscaling de pods via `metrics-server`/HPA e **entrada pública por um AWS API Gateway**, que alcança a aplicação por um caminho **inteiramente privado** (VPC Link → NLB interno → NodePort dos nós). O **cluster** continua sem exposição direta — nenhum recurso dele tem IP público e o balanceador é interno —, e o `kubectl port-forward` permanece disponível como acesso de diagnóstico. O ambiente é um **`prod-simulated`** de laboratório (AWS Academy), o que motiva várias das escolhas minimalistas discutidas em [Limitações](#limitações-e-o-que-produção-exigiria).

## Índice

- [Como ler os dois desenhos](#como-ler-os-dois-desenhos)
- [As cinco camadas de provisionamento](#as-cinco-camadas-de-provisionamento)
- [Inventário de componentes e ownership](#inventário-de-componentes-e-ownership)
- [Topologia de rede](#topologia-de-rede)
- [Fluxo em tempo de execução (quem chama quem)](#fluxo-em-tempo-de-execução-quem-chama-quem)
- [Fluxo de provisionamento (ordem de criação)](#fluxo-de-provisionamento-ordem-de-criação)
- [Postura de segurança](#postura-de-segurança)
- [Limitações e o que produção exigiria](#limitações-e-o-que-produção-exigiria)
- [Documentação relacionada](#documentação-relacionada)

## Como ler os dois desenhos

A infraestrutura é documentada por **duas vistas complementares**. Ler as duas em conjunto evita confusão, porque elas têm propósitos diferentes — e **níveis de fidelidade diferentes**.

**1) Vista lógica / de conexões** — mostra os componentes e o fluxo entre eles (quem fala com quem), priorizando a clareza do desenho sobre a precisão topológica.

<p align="center"><img src="../diagrams/infrastructure-diagram.jpeg" alt="Diagrama lógico da infraestrutura, registro da fase anterior em que o PostgreSQL rodava dentro do cluster: usuário Dev/QA acessando via kubectl port-forward um Service ClusterIP que encaminha ao Pod da API; dentro do EKS os Services ClusterIP de API, MailHog e PostgreSQL ligados aos respectivos Deployments/StatefulSet; NAT Gateway para egresso, Internet Gateway, Security Group do control plane, ECR, CloudWatch e IAM. A persistência corrente é Amazon RDS, fora do cluster, alcançada pela rede a partir das subnets privadas" width="100%"></p>

> ⚠️ **Este desenho é uma simplificação de uma única AZ** (ele mesmo declara isso em "Observações"). Para reduzir ruído visual, representa **uma** zona de disponibilidade e usa CIDRs ilustrativos (`pública 10.0.1.0/24`, `privada 10.0.1.128/24`) que **não correspondem** ao que o Terraform provisiona. A rede real tem **duas** AZs e outros CIDRs — use a vista física abaixo (e a seção [Topologia de rede](#topologia-de-rede)) como fonte da verdade sobre o endereçamento.

**2) Vista física / de recursos** — detalha os recursos como são realmente provisionados (duas AZs, CIDRs reais, tipo de instância, políticas). Esta vista bate com o IaC **em rede, cluster e serviços de apoio**; o PostgreSQL desenhado dentro do EKS é registro da fase anterior, e a persistência corrente é o **Amazon RDS, fora do cluster**.

<p align="center"><img src="../diagrams/infrastructure-details.png" alt="Diagrama detalhado da infraestrutura: VPC 10.0.0.0/16 com 2 subnets públicas (10.0.0.0/24 e 10.0.1.0/24) e 2 privadas (10.0.10.0/24 e 10.0.11.0/24) em AZ-A/AZ-B, Internet Gateway, NAT Gateway com Elastic IP, cluster EKS 1.35 com node group t3.small, workloads agrupados por origem de provisionamento (Aplicação via kubectl, PostgreSQL e Plataforma via Terraform), e serviços de suporte ECR, CloudWatch, IAM pré-existente e backend S3. O PostgreSQL dentro do cluster é registro da fase anterior: a persistência corrente é Amazon RDS, provisionado em stack Terraform própria, fora do cluster" width="100%"></p>

## As cinco camadas de provisionamento

A infraestrutura é criada em **cinco camadas** com ciclos de vida distintos — a divisão é deliberada (recursos estáveis no Terraform, recursos que mudam a cada deploy em manifests aplicados pelo pipeline):

| # | Camada / Repositório | Ferramenta | O que provisiona | Estado |
|---|---|---|---|---|
| 1 | **`oficina-mecanica-infra-base`** | Terraform | Rede AWS (VPC, subnets públicas/privadas, IGW, NAT Gateway, Route Tables) | S3 `infra/prod-simulated/infra-base/terraform.tfstate` |
| 2 | **`oficina-mecanica-k8s`** | Terraform + Helm | EKS (cluster + node group), ECR, CloudWatch, Security Group, Namespace, `metrics-server` — **não** provisiona banco | S3 `infra/prod-simulated/k8s/terraform.tfstate` |
| 3 | **`oficina-mecanica-database`** | Terraform | **Amazon RDS (PostgreSQL 16 gerenciado)**, fora do cluster, nas subnets privadas da VPC | State próprio |
| 4 | **`oficina-mecanica-app` (`k8s/*.yaml`)** | **CD (`kubectl`)** | API (Deployment/Service/HPA), ConfigMap, Secret, MailHog, Job de migração | Sem state — reaplicado a cada deploy |
| 5 | **`oficina-mecanica-gateway`** | Terraform | **AWS API Gateway (HTTP API)**, stage, VPC Link, security group e log de acesso — a **borda pública** da solução | S3 `infra/prod-simulated/gateway/terraform.tfstate` |

Os **quatro** stacks Terraform têm states separados porque o stack de Kubernetes (Camada 2) e o de banco (Camada 3) consomem a rede e as subnets da Camada 1, e o stack da borda (Camada 5) consome a rede da Camada 1 e o caminho privado da Camada 2 — todos via `data.terraform_remote_state`. A camada 4 não é Terraform: são manifests declarativos aplicados pelo pipeline de CD, porque imagem, envs e escala mudam com muito mais frequência que a plataforma. Detalhes da divisão em [kubernetes.md › Motivo da divisão](kubernetes.md#motivo-da-divisão) e [terraform.md](terraform.md).

## Inventário de componentes e ownership

O mapa **"quem provisiona o quê / para que serve"**, agrupado pelas cinco camadas:

### Camada 1 — `oficina-mecanica-infra-base` (Terraform)

| Recurso | Definido em | Finalidade |
|---|---|---|
| **VPC** `10.0.0.0/16` | `networking.tf` | Rede isolada que hospeda todo o cluster; DNS support/hostnames habilitados |
| **2 subnets públicas** (`10.0.0.0/24`, `10.0.1.0/24`) | `networking.tf` | Hospedam o NAT Gateway; `map_public_ip_on_launch`; tag `kubernetes.io/role/elb` |
| **2 subnets privadas** (`10.0.10.0/24`, `10.0.11.0/24`) | `networking.tf` | Hospedam os nodes do EKS; sem IP público; tag `kubernetes.io/role/internal-elb` |
| **Internet Gateway** | `networking.tf` | Entrada/saída pública da VPC (rota das subnets públicas) |
| **NAT Gateway + Elastic IP** | `networking.tf` | Egresso das subnets privadas para a internet, com IP fixo; **único**, na `public[0]` |
| **Route tables** (`rt_public`, `rt_private`) | `networking.tf` | `rt_public` → IGW; `rt_private` → NAT Gateway |

### Camada 2 — `oficina-mecanica-k8s` (Terraform)

| Recurso | Definido em | Finalidade |
|---|---|---|
| **EKS cluster** (`1.35`) | `eks.tf` | Control plane Kubernetes gerenciado; endpoint **público e privado**; usa IAM roles **pré-existentes** (lidas via `data`, não criadas) |
| **EKS node group** (`t3.small`, `1/1/1`) | `eks.tf` | Worker nodes EC2 nas **subnets privadas**; `desired = min = max = 1` |
| **Security Group** `secgrp-eks-cluster-*` | `eks.tf` | Control plane do EKS: ingress `443` **da CIDR da VPC**, egress `0.0.0.0/0` |
| **CloudWatch Log Group** | `eks.tf` | Logs do control plane (`api`, `audit`, `authenticator`, `controllerManager`, `scheduler`); retenção **14 dias** |
| **ECR** (+ lifecycle policy) | `ecr.tf` | Registry das imagens da API; `scan_on_push`; criptografia `AES256`; **mantém as últimas 20 imagens** |
| **Namespace** `oficina` | `k8s_namespace.tf` | Namespace compartilhado de toda a solução |
| ~~**Secret** `postgres-secret`~~ | `k8s_postgres.tf` | 🕰️ **Registro histórico da fase anterior** — a persistência corrente é **Amazon RDS, fora do cluster** (stack Terraform [`oficina-mecanica-database`](https://github.com/FIAP-15SOAT/oficina-mecanica-database)). |
| ~~**Service** `postgres` (ClusterIP `5432`)~~ | `k8s_postgres.tf` | 🕰️ **Registro histórico da fase anterior** — a persistência corrente é **Amazon RDS, fora do cluster** (stack Terraform [`oficina-mecanica-database`](https://github.com/FIAP-15SOAT/oficina-mecanica-database)). |
| ~~**StatefulSet** `postgres` (`postgres:16-alpine`)~~ | `k8s_postgres.tf` | Banco **no cluster**; 1 réplica; volume `emptyDir` (efêmero); probes `pg_isready`. 🕰️ **Registro histórico da fase anterior** — a persistência corrente é **Amazon RDS, fora do cluster** (stack Terraform [`oficina-mecanica-database`](https://github.com/FIAP-15SOAT/oficina-mecanica-database)). |
| **metrics-server** (Helm `3.13.0`) | `k8s_metrics_server.tf` | Métricas de CPU/memória em `kube-system`; **habilita o HPA** |
| **NLB interno** `nlb-oficina-mecanica-api` | `nlb.tf` | Fronteia a API para o API Gateway; nas **subnets privadas**, sem IP público, com **cross-zone habilitado** (um nó só em duas AZs) |
| **Target Group** `tg-oficina-mecanica-api` | `nlb.tf` | Alvos do tipo `instance` na **NodePort `30080`**; health check **HTTP em `/api/health/ready`** — o mesmo endpoint da `readinessProbe` |
| **Listener TCP:80** + **Autoscaling Attachment** | `nlb.tf` | Encaminha ao target group e mantém os nós do ASG registrados automaticamente, inclusive após substituição do node group |
| **Regra de ingress** da NodePort | `nlb.tf` | Libera a `30080` no SG gerenciado do cluster **apenas para a CIDR da VPC** |

### Camada 3 — `oficina-mecanica-database` (Terraform)

| Recurso | Definido em | Finalidade |
|---|---|---|
| **Instância RDS** PostgreSQL 16 (`db.t4g.micro`, Single-AZ, 20 GiB GP3) | [`oficina-mecanica-database`](https://github.com/FIAP-15SOAT/oficina-mecanica-database) | Persistência relacional da aplicação, **fora do cluster**; alcançada pela rede a partir das subnets privadas |
| **DB subnet group + Security Group** | idem | Aloca a instância nas subnets privadas da VPC, com ingress restrito à CIDR da VPC |

### Camada 4 — `k8s/*.yaml` (aplicado pelo CD via `kubectl`)

| Recurso | Manifesto | Finalidade |
|---|---|---|
| **Job** `db-migrate` (one-shot) | `00-db-migrate-job.yaml` | `prisma migrate deploy` + `db seed`; renderizado por run; TTL de 14 dias; `backoffLimit: 0` |
| **Secret** `api-secret` | criado via `kubectl create secret` (`01-api-secret.yaml` é só referência para deploy manual) | `DATABASE_URL` + `JWT_SECRET` / `JWT_REFRESH_SECRET` / `CUSTOMER_JWT_PUBLIC_KEY` |
| **ConfigMap** `api-config` | `02-api-configmap.yaml` | Envs não-sensíveis (`NODE_ENV`, `PORT`, expirações JWT, `BCRYPT_SALT_ROUNDS`, `MAIL_HOST/PORT`, `TZ`, `CUSTOMER_JWT_ISSUER`/`CUSTOMER_JWT_AUDIENCE`, `LOG_LEVEL`, `OTEL_SERVICE_*`, `TRUSTED_PROXY_CIDRS` e as três chaves de telemetria). O CD renderiza `OTEL_EXPORTER_OTLP_ENDPOINT` a partir da variável homônima do GitHub Actions; valor vazio desliga o SDK por completo |
| **Deployment** `oficina-api` | `03-api-deployment.yaml` | A API NestJS; 1 réplica; `:sha` imutável; três probes HTTP em `/api/health/live` (startup + liveness) e `/api/health/ready` (readiness) |
| **Deployment** `mailhog` | `03-mailhog-deployment.yaml` | Sink SMTP de desenvolvimento (captura e-mails de orçamento) |
| **Service** `oficina-api` (**NodePort** `3000` → `30080`) | `04-api-service.yaml` | Expõe a API dentro do cluster **e** na porta `30080` dos nós, que é o destino do target group do NLB interno. `NodePort` é um superconjunto de `ClusterIP`: o DNS interno e o `port-forward` seguem iguais |
| **Service** `mailhog` (ClusterIP `1025`/`8025`) | `04-mailhog-service.yaml` | SMTP (`1025`) + interface web (`8025`) |
| **HPA** `oficina-api-hpa` (`1`→`5`) | `05-api-hpa.yaml` | Autoscaling da API por CPU (70%) e memória (80%) |

### Camada 5 — `oficina-mecanica-gateway` (Terraform)

| Recurso | Definido em | Finalidade |
|---|---|---|
| **API Gateway HTTP API** + stage `$default` | [`oficina-mecanica-gateway`](https://github.com/FIAP-15SOAT/oficina-mecanica-gateway) | **Ponto de entrada público** da solução; publica `POST /customer-auth/login`, `POST /api/auth/login` e `ANY /api/{proxy+}` |
| **VPC Link V2** + security group só de egress | idem | ENIs nas subnets privadas; é o que permite a integração privada alcançar o NLB interno sem sair da VPC |
| **CloudWatch Log Group** do log de acesso | idem | Log de acesso JSON da borda, retenção **14 dias** — sem corpo, sem query string e sem cabeçalho de autorização |

> A borda **não autentica e não autoriza**: encaminha o cabeçalho de autorização intacto e a decisão continua sendo da API (ver [ADR 0004](../adr/0004-autenticacao-de-clientes.md)). A única responsabilidade que ela assume no fluxo de autenticação é a limitação de frequência das duas rotas de login.

### Camada de coleta controlada pelo CD

A aplicação declara os três sinais, e a camada que os recebe é aplicada condicionalmente pelo CD. O inventário separa o que já está automatizado do que ainda depende de configuração adicional na plataforma:

| Componente | Estado | Finalidade |
|---|---|---|
| Agente com receiver OTLP (DaemonSet) | ✅ versionado em `k8s/06`–`08`; aplicado quando `vars.ENABLE_TELEMETRY_COLLECTION == 'true'` | Recebe traços e métricas em `:4318`, lê o stdout dos contêineres e as métricas de kubelet/cAdvisor. É a **única** peça que conhece o fornecedor |
| Pipeline de log promovendo `trace_id`/`span_id` | ❌ não provisionado | Liga a linha de log ao traço no destino |
| **Monitor sintético externo** | ❌ não provisionado | O que de fato fecha o requisito de **uptime**: readiness decide roteamento e liveness decide reinício, mas **nenhuma das duas enxerga** DNS, load balancer, TLS ou ingress — é possível ter 100% dos pods `Ready` com a API inacessível de fora |
| Dashboards e monitores | ❌ não provisionado | Volume diário de OS, tempo por status, latência por rota, ocupação de pool, `mail.send.failed`, `health.degraded` |

Os controles são independentes. `ENABLE_TELEMETRY_COLLECTION` decide se o CD aplica o Agent; `OTEL_EXPORTER_OTLP_ENDPOINT` é renderizado no ConfigMap e decide se o SDK da aplicação inicia. Valor vazio desliga o SDK, e um endpoint válido ativa a exportação. Como o ConfigMap é consumido por variáveis de ambiente, o CD reinicia o Deployment da API para propagar o valor aos Pods. Ver [ADR 0005](../adr/0005-opentelemetry.md).

## Topologia de rede

Fiel ao repositório [`oficina-mecanica-infra-base`](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-base) (`networking.tf` e `variables.tf`):

- **VPC** `10.0.0.0/16`, nas **2 primeiras AZs** de `us-east-1` (`slice(azs, 0, 2)` → `us-east-1a`, `us-east-1b`).
- **Subnets públicas**: `10.0.0.0/24` (AZ-a) e `10.0.1.0/24` (AZ-b) — associadas à `rt_public` (rota `0.0.0.0/0` → **Internet Gateway**). Hospedam o NAT Gateway.
- **Subnets privadas**: `10.0.10.0/24` (AZ-a) e `10.0.11.0/24` (AZ-b) — associadas à `rt_private` (rota `0.0.0.0/0` → **NAT Gateway**). Hospedam os nodes do EKS.
- **Um** Internet Gateway e **um** NAT Gateway (+ Elastic IP), este na `public[0]`.
- **Security Group** do control plane: ingress **`443` apenas da CIDR da VPC**; egress liberado.

> Existem **duas** subnets por camada porque o EKS **exige ≥ 2 AZs** — há inclusive um bloco `validation` em `variables.tf` que falha o `plan` com menos de 2 CIDRs. Isso é um requisito do control plane, **não** alta disponibilidade do workload — ver [Limitações](#limitações-e-o-que-produção-exigiria).

## Fluxo em tempo de execução (quem chama quem)

Há **dois** caminhos de entrada: o público, pela borda, e o de diagnóstico, por túnel. A partir do pod, tudo é comunicação **intra-cluster** por DNS de Service:

```
Cliente (internet) ──HTTPS──▶ API Gateway (HTTP API)
                                   │  ANY /api/{proxy+} e POST /api/auth/login
                                   ▼
                              VPC Link V2 (ENIs nas subnets privadas)
                                   ▼
                              NLB interno :80 ──▶ Node :30080 (NodePort)
                                                        │
Dev/QA ──┤ kubectl port-forward 3000:3000 ├──▶ Service oficina-api (:3000)
                                                        │
                                                        ▼
                                               Pod oficina-api (:3000)
                                     DATABASE_URL │        │ MAIL_HOST=mailhog:1025
                                                  ▼        ▼
                            Amazon RDS (:5432)         Service mailhog (:1025)
                            fora do cluster,                 │
                            subnets privadas                 ▼
                                                     Deployment mailhog (1025/8025)

Cliente (internet) ──HTTPS POST /customer-auth/login──▶ API Gateway ──▶ Lambda de
                                                       autenticação de clientes
                                                       (repositório próprio)

Pod (subnet privada) ──egresso 0.0.0.0/0──▶ NAT Gateway ──▶ Internet
Node (subnet privada) ──pull da imagem :sha──▶ Amazon ECR (via NAT)
```

- **Entrada pública**: o endereço do API Gateway. `ANY /api/{proxy+}` cobre toda a API e `POST /api/auth/login` existe como rota explícita apenas para receber limitação de frequência mais restritiva. A borda **não valida credenciais**: um `401` numa rota protegida é produzido pela própria API. Um caminho não publicado recebe `404` **da borda**, sem alcançar o cluster.
- **Entrada de diagnóstico**: `kubectl port-forward -n oficina svc/oficina-api 3000:3000` → API em `http://localhost:3000` (Swagger em `/api/docs`). Continua funcionando exatamente como antes — `NodePort` não substitui o `ClusterIP`, o acrescenta. Ver [kubernetes.md › Acesso à aplicação](kubernetes.md#acesso-à-aplicação-em-kubernetes).
- **Endereço de origem do cliente**: fica registrado **no log de acesso da borda**, não na aplicação. HTTP APIs convertem a família `X-Forwarded-*` no cabeçalho padrão `Forwarded` (RFC 7239), que o Express não interpreta — por isso `TRUSTED_PROXY_CIDRS` continua vazio, e isso é decisão fechada, não pendência. A ligação entre os dois lados é o `x-request-id`: a borda o sobrescreve com o identificador da requisição dela, e a API já prefere esse cabeçalho de entrada, de modo que a linha do log de acesso e a linha do log estruturado compartilham o mesmo identificador.
- **API → PostgreSQL**: via `DATABASE_URL` (`api-secret`) apontando para o endpoint do **Amazon RDS**, fora do cluster, alcançado pela rede a partir das subnets privadas. Quem reporta se esse caminho está de pé é a `readinessProbe` da API em `/api/health/ready` — não existe pod de banco para inspecionar.
- **API → MailHog**: SMTP em `mailhog:1025` (do `api-config`), para os e-mails de aprovação/rejeição de orçamento.
- **Egresso**: pods e nodes nas subnets privadas saem para a internet **pelo NAT Gateway** (inclusive o `pull` das imagens do ECR — não há VPC endpoints).

## Fluxo de provisionamento e deploy

A entrega segue a separação desacoplada entre os três repositórios:

```
[oficina-mecanica-infra-base] ──(S3 Remote State)──▶ [oficina-mecanica-k8s]
                          │                                  │
                          │                                  ▼ (EKS + ECR + NLB interno prontos)
                          │                    [oficina-mecanica-app (CD)] :
                          │                    build-push-image ──▶ db-migrate ──▶ app-deploy
                          │                                  │
                          └────(S3 Remote State)─────────────┴──▶ [oficina-mecanica-gateway]
                                                                   (VPC + caminho privado)
```

1. **`oficina-mecanica-infra-base`**: Provisiona a VPC, subnets públicas/privadas, IGW, NAT Gateway e tabelas de roteamento, exportando o estado no S3.
2. **`oficina-mecanica-k8s`**: Consome a VPC e subnets do estado de rede via `data.terraform_remote_state`, provisionando o cluster EKS, Node Group, ECR, namespace `oficina` e Metrics Server. **Não** provisiona banco — o RDS tem stack própria (`oficina-mecanica-database`).
3. **`oficina-mecanica-app` (CD)**:
   - **`build-push-image`**: Constrói a imagem Docker multi-stage da aplicação NestJS e realiza o push para o Amazon ECR com tags imutáveis (`:sha` e `:latest`).
   - **`db-migrate`**: Executa o Kubernetes Job descartável aplicando `prisma migrate deploy` e `prisma db seed` de forma não-destrutiva.
   - **`app-deploy`**: Renderiza os secrets/configmaps e aplica os manifests Kubernetes (Deployments, Services, HPA) validando o rollout.

4. **`oficina-mecanica-gateway`**: consome a VPC e as subnets privadas do estado de rede e o `api_nlb_listener_arn` do estado de Kubernetes, provisionando o API Gateway, o VPC Link e o log de acesso da borda. É o **último** da ordem, porque a integração privada precisa do listener já existente — o stack falha com mensagem explícita, por precondição, se ele não estiver publicado.

> **Ordem de aplicação desta mudança.** `oficina-mecanica-k8s` (NLB) → `oficina-mecanica-app` (este `Service` como `NodePort`) → `oficina-mecanica-gateway` (borda). O rollback é a ordem inversa, e ela importa: reverter o `Service` antes de remover a borda deixa o target group sem destino.

O detalhamento job a job (gates, `environment: production`, `ENABLE_DEPLOY`, secrets) está em [ci-cd.md › Workflow de CD](ci-cd.md#2-workflow-de-cd-cdyml).

## Postura de segurança

- **A aplicação é pública apenas através da borda.** O Service da API é `NodePort`, alcançável a partir dos nós; **não há ALB nem Ingress públicos**. O único caminho externo é o **API Gateway** → VPC Link → **NLB interno** (sem IP público, nas subnets privadas) → NodePort. A regra de security group que libera a `30080` aceita apenas a **CIDR da VPC**, então a porta não é alcançável da internet nem que alguém descubra o IP de um nó. O `kubectl port-forward` (autenticado pelo RBAC) segue como acesso de diagnóstico.
- **A borda não é um controle de autenticação.** Ela encaminha o cabeçalho de autorização intacto e não o inspeciona, valida ou registra em log; `401`/`403` continuam sendo produzidos pela API. O que a borda acrescenta é **limitação de frequência** nas duas rotas de login — um alvo **agregado por rota** e de melhor esforço, não uma cota por cliente.
- **Consequência aceita: `/api/docs`, `/api/docs-json` e os endpoints de health passam a ser publicamente alcançáveis** pela rota de proxy. É decisão consciente, pelo caráter acadêmico e demonstrativo, e não por falta de alternativa — as opções (não montar o Swagger em produção, ou exigir `AWS_IAM` na rota exata) existem e não foram escolhidas. Registrada em `docs/security.md` do repositório do Gateway.
- **Consequência aceita: a autorização é aplicada por controller, não por guard global.** Hoje todos os controllers de negócio declaram `@UseGuards` e `auth`/`health` são exceções deliberadas — não há buraco atual. O que muda com `ANY /api/{proxy+}` é o **custo de um esquecimento futuro**: um controller novo sem `@UseGuards` fica público na internet sem passar por nenhum outro repositório.
- **Endpoint do EKS é público (mas autenticado).** O control plane tem `endpoint_public_access = true` **e** `endpoint_private_access = true`: o servidor de API do Kubernetes é alcançável pela internet, porém protegido por autenticação/autorização IAM+RBAC. O Security Group do control plane só aceita `443` **da CIDR da VPC**.
- **Nodes em subnets privadas.** Sem IP público; todo egresso passa pelo NAT Gateway.
- **Fluxo de segredos.** A credencial do banco alimenta a `DATABASE_URL` do `api-secret`, consumida pela API e montada no CD a partir das variáveis do repositório e do endpoint do RDS. Segredos de aplicação (`JWT_*`, `CUSTOMER_JWT_PUBLIC_KEY`) vêm dos GitHub Secrets e são renderizados no deploy. Detalhes em [ci-cd.md › Injeção de secrets](ci-cd.md#injeção-de-secrets-da-aplicação).
- **ECR com `scan_on_push`** e imagens criptografadas (`AES256`); análise SAST/DAST cobre o código e a API em execução — ver [Segurança](../security.md).

## Limitações e o que produção exigiria

Este é um ambiente **acadêmico** com orçamento de laboratório; as decisões abaixo são conscientes. Documentá-las é parte do rigor do projeto.

- **Autoscaling é de pods (API), não de cluster.** O HPA do `oficina-api` escala **1→5 réplicas** por CPU (70%) e memória (80%) — escala validada sob carga, atingindo o teto normalmente. O node group é mantido **fixo em 1** (`desired = min = max = 1`, um único `t3.small`) por decisão: autoscaling de _cluster_ (Cluster Autoscaler/Karpenter) está **fora do escopo** deste laboratório — o requisito é escalar os pods da API, não os nodes. *Produção*: escala real do node group + Cluster Autoscaler (ou Karpenter), caso a demanda de pods venha a exceder a capacidade de um único node.
- **"Duas AZs" é requisito do EKS, não alta disponibilidade.** As 2 subnets por camada existem porque o control plane exige ≥ 2 AZs (bloco `validation`), mas com **1 node** (o workload vive numa única AZ por vez) e **1 NAT Gateway** (todo o egresso por uma AZ só, na `public[0]`), não há redundância entre zonas — o sistema é **efetivamente single-AZ**. *Produção*: nodes distribuídos nas AZs e um NAT por AZ.
- **~~PostgreSQL em `emptyDir` (efêmero)~~ — resolvido, e mantido aqui como registro.** Esta era a limitação da fase anterior: banco dentro do cluster, sem persistência entre reagendamentos do pod, consequência direta do EBS CSI Driver sem credenciais IAM no lab (Academy bloqueia IAM/IRSA). A persistência corrente é **Amazon RDS**, fora do cluster, exatamente o caminho que aquela análise apontava. A análise completa (tentativas com `gp2`/`gp3`, diagnóstico do `CrashLoopBackOff`) está em [kubernetes.md › Armazenamento do PostgreSQL](kubernetes.md#armazenamento-do-postgresql-ausência-do-ebs-csi-driver-e-uso-de-emptydir).
- **Sem VPC endpoints.** O `pull` de imagens do ECR e o acesso ao state no S3 saem pela internet (NAT/IGW). *Produção*: VPC endpoints (gateway para S3, interface para ECR/CloudWatch) reduzem custo de NAT e mantêm o tráfego privado.
- **ECR `MUTABLE`, mas o pipeline fixa `:sha`.** O repositório permite sobrescrever tags, porém o CD publica com tag imutável por commit (`:sha`) e move `latest` em paralelo — imutabilidade por **convenção**, não imposta pelo registry. *Produção*: `IMMUTABLE` no ECR para garantir por política.
- **State com lock nativo do S3.** O backend usa `use_lockfile = true` (Terraform ≥ 1.11) em vez de uma tabela DynamoDB de lock — mais simples, sem recurso extra.
- **A coleta depende de configuração operacional.** Os manifestos do Agent existem em `k8s/06-datadog-secret.yaml`, `k8s/07-datadog-agent.yaml` e `k8s/08-datadog-service.yaml`; o CD os aplica somente quando `vars.ENABLE_TELEMETRY_COLLECTION == 'true'` e exige `DD_API_KEY`. Separadamente, o valor de `vars.OTEL_EXPORTER_OTLP_ENDPOINT` é renderizado no ConfigMap para ligar ou desligar o SDK da aplicação. `eks.tf` cobre apenas os logs do control plane, com 14 dias de retenção. Falta ainda o monitor sintético externo, sem o qual uptime real não se mede — nenhuma probe enxerga DNS, load balancer ou ingress. *Pré-requisito operacional*: capacidade suficiente no node (abaixo).
- **O teto de pods do node já aperta o HPA.** Um `t3.small` permite **11 pods** e os workloads existentes ocupam 6 — o `maxReplicas: 5` já não cabe hoje, antes de qualquer agente. É pré-requisito de capacidade (`t3.medium`, 17 pods) em `oficina-mecanica-k8s`. Ver [kubernetes.md › Autoscaling](kubernetes.md#autoscaling-da-api-hpa).
- **O balanceador falha aberto, e com um nó só isso é o caso comum.** Se **nenhum** alvo estiver saudável — ou o target group estiver vazio —, o NLB volta a encaminhar para todos, independentemente da saúde deles. Com `desired = min = max = 1`, qualquer reinício do nó ou queda do banco cai nesse caso. Consequência prática: sem banco, `/api/health/ready` responde `503` **vindo da aplicação** (não um `5xx` da borda) e `/api/health/live` responde `200` — é a prontidão, e não a vivacidade, que distingue "a solução responde" de "a solução está utilizável". A borda só devolve `5xx` própria quando o caminho de rede em si falha (VPC Link inativo, listener ausente, conexão recusada). *Produção*: mais de um nó, fora do orçamento deste laboratório.
- **Sem TLS entre a borda e o cluster.** O listener do NLB é TCP:80; a criptografia termina no API Gateway. Coerente com a postura atual do cluster, que também não tem TLS interno. *Produção*: listener HTTPS com certificado no balanceador.
- **Custo é o driver das escolhas.** O control plane do EKS e o NAT Gateway já consomem a maior parte do crédito de laboratório (US$ 50 do AWS Academy), o que mantém a infraestrutura mínima e sem redundância — o RDS corrente é a menor instância possível (`db.t4g.micro`, Single-AZ). O NLB interno acrescenta ~US$ 0,54/dia de **piso**, e por isso é protegido pelo interruptor `enable_api_load_balancer` em `oficina-mecanica-k8s`. O objetivo do projeto é demonstrar arquitetura e pipeline, não operar produção.

## Documentação relacionada

- 🌍 [Infra · Terraform](terraform.md) — stacks, estados remotos, entradas/saídas, como aplicar.
- ☸️ [Infra · Kubernetes](kubernetes.md) — manifests, armazenamento (`emptyDir`/EBS CSI, histórico), health probes, deploy manual.
- 🔄 [Infra · CI/CD](ci-cd.md) — workflows de CI, CD, SAST e DAST; ordem de deploy; secrets/variables.
- 🌐 [`oficina-mecanica-gateway`](https://github.com/FIAP-15SOAT/oficina-mecanica-gateway) — a borda pública: rotas, contrato OpenAPI, integração privada, observabilidade e ADRs da borda.
- 🔒 [Segurança](../security.md) — mitigações no código e relatórios (ZAP, SonarQube).
- 🧩 [Modelo C4](../c4/README.md) — Contexto, Containers e Componentes (visão C4 Model).
