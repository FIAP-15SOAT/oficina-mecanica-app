# 🌍 Terraform (IaC)

Dois stacks Terraform independentes: `aws-base` (rede + EKS + ECR) e `k8s-base` (workloads Kubernetes compartilhados).

> 🧭 Para a **visão de sistema** (inventário completo, topologia de rede, fluxo em tempo de execução, postura de segurança e limitações), comece pela [Visão Geral da Infraestrutura](overview.md). **Este documento é a referência em nível de HCL** dos dois stacks: como cada recurso é configurado e por quê.

## Índice

- [Estrutura e estados remotos](#estrutura-e-estados-remotos)
- [Providers e versionamento](#providers-e-versionamento)
- [Convenções: tags e nomenclatura](#convenções-tags-e-nomenclatura)
- [Recursos provisionados — `aws-base`](#recursos-provisionados--aws-base)
- [Recursos provisionados — `k8s-base`](#recursos-provisionados--k8s-base)
- [Variáveis e saídas](#variáveis-e-saídas)
- [Como aplicar localmente](#como-aplicar-localmente)

A infraestrutura foi separada em dois stacks Terraform independentes para reduzir acoplamento e tornar o fluxo de provisionamento previsível:

- `infra/aws-base`: recursos-base de cloud (rede + EKS + ECR)
- `infra/k8s-base`: recursos Kubernetes compartilhados (namespace, banco PostgreSQL e metrics-server)

Essa separação foi adotada para evitar bootstrap complexo do provider Kubernetes no mesmo stack de criação do EKS e para permitir evolução independente entre camada cloud e camada de workloads. O ganho concreto dessa divisão — o provider Kubernetes do `k8s-base` autenticando a partir das saídas do `aws-base` — é detalhado em [Recursos provisionados — `k8s-base`](#recursos-provisionados--k8s-base).

## Estrutura e estados remotos

Cada stack tem **state próprio** num backend S3 (bucket `bkt-oficina-mecanica`, região `us-east-1`), com chaves distintas:

| Stack | Diretório | Chave do state (S3) |
|---|---|---|
| Cloud | `infra/aws-base` | `infra/prod-simulated/aws-base/terraform.tfstate` |
| Workloads | `infra/k8s-base` | `infra/prod-simulated/k8s-base/terraform.tfstate` |

Os dois backends usam `encrypt = true` (criptografia do state em repouso via SSE) e **`use_lockfile = true`** — o **lock nativo do S3** introduzido no Terraform ≥ 1.11, que dispensa uma tabela DynamoDB dedicada só para o lock (um objeto `.tflock` no próprio bucket serializa `apply`s concorrentes). Simplifica a operação: um único recurso (o bucket) cobre state + lock.

O `k8s-base` **consome** `terraform_remote_state` do stack `aws-base` para obter endpoint, CA e nome do cluster — ver a seção do `k8s-base`.

## Providers e versionamento

Versões fixadas por faixa (`required_providers` + `required_version`), garantindo builds reprodutíveis:

| Provider / ferramenta | Restrição | Onde | Usado por |
|---|---|---|---|
| Terraform (core) | `>= 1.11.0` | `*/backend.tf` | ambos (o `use_lockfile` exige ≥ 1.11) |
| `hashicorp/aws` | `>= 6.46.0, < 7.0.0` | `*/providers.tf` | ambos |
| `hashicorp/kubernetes` | `>= 2.32.0, < 3.0.0` | `k8s-base/providers.tf` | `k8s-base` |
| `hashicorp/helm` | `>= 3.0.0, < 4.0.0` | `k8s-base/providers.tf` | `k8s-base` |

## Convenções: tags e nomenclatura

**Tags padrão.** O provider `aws` aplica `default_tags` a **todos** os recursos, sem precisar repetir tags recurso a recurso:

| Tag | Valor |
|---|---|
| `Project` | `var.project_name` (`oficina-mecanica`) |
| `ManagedBy` | `terraform` |
| `Environment` | `var.environment` (`prod-simulated`) |

**Nomenclatura.** Todos os nomes de recurso são compostos a partir de `project_name` em `aws-base/locals.tf`, o que mantém o inventário consistente e previsível:

| Local | Padrão | Exemplo |
|---|---|---|
| `vpc_name` | `vpc-${project}` | `vpc-oficina-mecanica` |
| `eks_cluster_name` | `eks-${project}` | `eks-oficina-mecanica` |
| `eks_subnet_name` | `subnet-eks-${project}` | `subnet-eks-oficina-mecanica-public-1` |
| `eks_node_group_name` | `ng-eks-${project}-default` | `ng-eks-oficina-mecanica-default` |
| `ecr_app_repo_name` | `ecr-${project}-app-repo` | `ecr-oficina-mecanica-app-repo` |
| `secgrp_eks_cluster_name` | `secgrp-eks-cluster-${project}` | `secgrp-eks-cluster-oficina-mecanica` |
| `cw_lg_eks_cluster_tag_name` | `cw-lg-eks-cluster-${project}` | `cw-lg-eks-cluster-oficina-mecanica` |

## Recursos provisionados — `aws-base`

### IAM: roles pré-existentes (lidas, não criadas)

O cluster e o node group usam roles IAM **pré-existentes** do laboratório, lidas via `data "aws_iam_role"` (`LabEksClusterRole` e `LabEksNodeRole`) — o Terraform **não as cria**. Isso é uma restrição do ambiente AWS Academy, que bloqueia a criação de IAM. Essa limitação tem um impacto direto e não óbvio no **armazenamento do banco**: sem permissão para configurar IRSA/policies, o EBS CSI Driver fica sem credenciais e o PostgreSQL cai em `emptyDir`. O diagnóstico completo está em [kubernetes.md › Armazenamento do PostgreSQL](kubernetes.md#armazenamento-do-postgresql-ausência-do-ebs-csi-driver-e-uso-de-emptydir); o resumo da cadeia, em [overview.md › Limitações](overview.md#limitações-e-o-que-produção-exigiria). Não repetido aqui.

### Rede (`networking.tf`)

- **VPC** `10.0.0.0/16`, com `enable_dns_support` e `enable_dns_hostnames` (necessários para o DNS interno de Service do EKS resolver).
- **AZs**: `slice(data.aws_availability_zones…, 0, 2)` seleciona as **2 primeiras** zonas de `us-east-1`. As variáveis `public_subnet_cidrs`/`private_subnet_cidrs` têm um bloco `validation` que **falha o `plan`** com menos de 2 CIDRs — o EKS exige ≥ 2 AZs no control plane (isso é requisito do control plane, **não** alta disponibilidade do workload; ver [overview.md › Limitações](overview.md#limitações-e-o-que-produção-exigiria)).
- **2 subnets públicas** (`10.0.0.0/24`, `10.0.1.0/24`): `map_public_ip_on_launch = true`; tags `kubernetes.io/cluster/<cluster> = shared` e `kubernetes.io/role/elb = 1`.
- **2 subnets privadas** (`10.0.10.0/24`, `10.0.11.0/24`): sem IP público; tags `kubernetes.io/cluster/<cluster> = shared` e `kubernetes.io/role/internal-elb = 1`.
- As **tags `kubernetes.io/role/{elb,internal-elb}`** não são decorativas: é assim que os controllers de load balancer do Kubernetes descobrem em quais subnets criar ELBs públicos (`elb`) ou internos (`internal-elb`). Elas deixam a rede pronta para um Ingress/ALB futuro, mesmo que hoje o acesso seja só por `port-forward`.
- **Internet Gateway** (rota das subnets públicas) e **um único** NAT Gateway + Elastic IP, alocado na `public[0]` (`depends_on` o IGW).
- **Route tables**: `rt_public` → `0.0.0.0/0` via IGW; `rt_private` → `0.0.0.0/0` via NAT Gateway.

### EKS (`eks.tf`)

- **Cluster** versão `1.35` (`var.kubernetes_version`), `role_arn` da role pré-existente. `vpc_config` cobre subnets privadas **e** públicas, com **endpoint público e privado** habilitados (`endpoint_public_access = true` + `endpoint_private_access = true`): o API server é alcançável pela internet, porém protegido por autenticação IAM+RBAC — ver [overview.md › Postura de segurança](overview.md#postura-de-segurança).
- **Logs do control plane** (`enabled_cluster_log_types`): `api`, `audit`, `authenticator`, `controllerManager`, `scheduler` — enviados a um **CloudWatch Log Group** com **retenção de 14 dias**.
- **Security Group** do control plane: ingress `443` **apenas da CIDR da VPC** (`var.vpc_cidr`); egress liberado (`0.0.0.0/0`).
- **Node group** gerenciado: instância `t3.small`, `desired = min = max = 1` (fixo em 1 node), agendado **nas subnets privadas**. O `depends_on` (Log Group + associações de route table) garante a ordem de criação.

### ECR (`ecr.tf`)

- Repositório de imagens da API com `image_tag_mutability = MUTABLE`, `scan_on_push = true` (varredura de vulnerabilidades a cada push) e criptografia `AES256`.
- **Lifecycle policy**: mantém as **últimas 20 imagens** (`imageCountMoreThan 20` → `expire`), evitando crescimento indefinido do registry. Observação: o repositório é `MUTABLE`, mas o pipeline publica com tag imutável por commit (`:sha`) — imutabilidade por **convenção**; ver [overview.md › Limitações](overview.md#limitações-e-o-que-produção-exigiria).

## Recursos provisionados — `k8s-base`

### Bootstrap dos providers Kubernetes/Helm (o porquê de dois states)

Este é o ponto que justifica a divisão em dois stacks. O `k8s-base` **não cria** o cluster — ele o **consome**. Em `providers.tf`:

1. `data "terraform_remote_state" "aws_base"` lê o state do `aws-base` no S3 e expõe `cluster_name`, `cluster_endpoint` e `cluster_certificate_authority_data`.
2. `data "aws_eks_cluster_auth"` gera um **token** de autenticação para esse cluster.
3. Os providers `kubernetes` **e** `helm` são configurados com `host` (endpoint), `cluster_ca_certificate` (`base64decode` do CA) e `token`.

Configurar o provider Kubernetes **no mesmo stack** que cria o EKS seria um problema de _chicken-and-egg_ (o provider precisa de um endpoint que ainda não existe no momento do `plan`). Separar os states resolve isso de forma limpa: o `aws-base` roda primeiro e publica os outputs; o `k8s-base` os lê.

### Namespace, PostgreSQL e metrics-server

- **Namespace** `oficina` (`k8s_namespace.tf`), rótulos `app.kubernetes.io/part-of` + `managed-by = terraform`.
- **PostgreSQL** (`k8s_postgres.tf`): `Secret postgres-secret` (`POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD`) + `Service` ClusterIP `5432` + `StatefulSet` (`postgres:16-alpine`, 1 réplica, `env_from` o Secret, requests `100m`/`256Mi`, limits `500m`/`512Mi`, volume **`emptyDir`**, probes `pg_isready`). Os mecanismos de runtime desse StatefulSet (probes, recursos, efemeridade do `emptyDir`) são detalhados em [kubernetes.md](kubernetes.md), onde vive a narrativa Kubernetes.
- **metrics-server** via Helm (`k8s_metrics_server.tf`): `helm_release` em `kube-system`, condicionado por `count = var.enable_metrics_server ? 1 : 0`. Opções relevantes: `atomic = true` (faz rollback se a instalação falhar), `cleanup_on_fail = true`, `wait = true`, `timeout = 300` e uma `version` **opcional** (se `metrics_server_chart_version` for vazio, instala a última versão do chart). O metrics-server é o que **alimenta o HPA** da API com métricas de CPU/memória.

## Variáveis e saídas

### `aws-base` — variáveis

| Variável | Tipo | Default | Finalidade |
|---|---|---|---|
| `aws_region` | `string` | `us-east-1` | Região de todos os recursos |
| `project_name` | `string` | `oficina-mecanica` | Base para nomes e tags |
| `environment` | `string` | `prod-simulated` | Nome do ambiente (tag `Environment`) |
| `kubernetes_version` | `string` | `1.35` | Versão do EKS |
| `eks_cluster_role_name` | `string` | `LabEksClusterRole` | Role IAM pré-existente do cluster (lida via `data`) |
| `eks_node_role_name` | `string` | `LabEksNodeRole` | Role IAM pré-existente do node group (lida via `data`) |
| `vpc_cidr` | `string` | `10.0.0.0/16` | CIDR da VPC |
| `public_subnet_cidrs` | `list(string)` | `["10.0.0.0/24","10.0.1.0/24"]` | Subnets públicas — `validation` exige ≥ 2 CIDRs |
| `private_subnet_cidrs` | `list(string)` | `["10.0.10.0/24","10.0.11.0/24"]` | Subnets privadas — `validation` exige ≥ 2 CIDRs |
| `node_instance_type` | `string` | `t3.small` | Tipo de instância do node group |
| `node_desired_size` | `number` | `1` | Nodes desejados |
| `node_min_size` | `number` | `1` | Nodes mínimos |
| `node_max_size` | `number` | `1` | Nodes máximos |

> Os valores reais aplicados vivem em `infra/aws-base/terraform.tfvars` (onde `eks_cluster_role_name`/`eks_node_role_name` recebem os nomes completos das roles do laboratório).

### `aws-base` — saídas

| Saída | Conteúdo |
|---|---|
| `cluster_name` | Nome do cluster EKS (usado pelo `k8s-base` para auth) |
| `cluster_endpoint` | Endpoint do API server |
| `cluster_certificate_authority_data` | CA do cluster em base64 |
| `cluster_version` | Versão do Kubernetes em uso |
| `vpc_id` | ID da VPC |
| `private_subnet_ids` | IDs das subnets privadas |
| `public_subnet_ids` | IDs das subnets públicas |
| `zz_next_steps` | Guia pós-`apply` impresso ao final: como exportar as credenciais AWS, rodar `aws eks update-kubeconfig` e validar com `kubectl get nodes` (o prefixo `zz_` só o ordena por último na saída) |

### `k8s-base` — variáveis

| Variável | Tipo | Default | Finalidade |
|---|---|---|---|
| `aws_region` | `string` | `us-east-1` | Região |
| `project_name` | `string` | `oficina-mecanica` | Base para tags |
| `environment` | `string` | `prod-simulated` | Nome do ambiente |
| `aws_base_state_bucket` | `string` | `bkt-oficina-mecanica` | Bucket do remote state do `aws-base` |
| `aws_base_state_key` | `string` | `infra/prod-simulated/aws-base/terraform.tfstate` | Chave do remote state do `aws-base` |
| `aws_base_state_region` | `string` | `us-east-1` | Região do bucket de state |
| `k8s_namespace` | `string` | `oficina` | Namespace compartilhado |
| `k8s_postgres_user` | `string` | `postgres` | Usuário do Postgres (Secret) |
| `k8s_postgres_db` | `string` | `techchallenge` | Nome do banco (Secret) |
| `k8s_postgres_password` | `string` | — (**`sensitive`**, sem default) | Senha do Postgres — injetada via `TF_VAR_k8s_postgres_password` no CI |
| `k8s_postgres_image` | `string` | `postgres:16-alpine` | Imagem do container do banco |
| `enable_metrics_server` | `bool` | `true` | Instala o metrics-server (habilita o HPA) |
| `metrics_server_chart_version` | `string` | `""` | Versão do chart (vazio = última) |

### `k8s-base` — saídas

| Saída | Conteúdo |
|---|---|
| `k8s_namespace` | Namespace da solução (`oficina`) |
| `postgres_service_dns` | DNS interno do banco: `postgres.oficina.svc.cluster.local` |
| `postgres_service_port` | Porta do Service do Postgres (`5432`) |

## Como aplicar localmente

Pré-requisitos:

- Terraform >= 1.11
- Credenciais AWS válidas no ambiente
- Bucket de state remoto já acessível

Ordem de execução (obrigatória):

```bash
# 1) Provisiona base cloud
cd infra/aws-base
terraform init
terraform plan
terraform apply

# 2) Provisiona workloads Kubernetes compartilhados
cd ../k8s-base
terraform init
terraform plan -var="k8s_postgres_password=<SENHA_FORTE>"
terraform apply -var="k8s_postgres_password=<SENHA_FORTE>"
```

No CI, o secret do PostgreSQL é injetado via `TF_VAR_k8s_postgres_password`.
