# 🌍 Terraform (IaC)

A infraestrutura é provisionada em dois repositórios Terraform independentes: [`oficina-mecanica-infra-base`](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-base) (fundação de rede AWS) e [`oficina-mecanica-k8s`](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s) (cluster EKS, ECR e plataforma de workloads Kubernetes).

> 🧭 Para a **visão de sistema** (inventário completo, topologia de rede, fluxo em tempo de execução, postura de segurança e limitações), consulte a [Visão Geral da Infraestrutura](overview.md). **Este documento é a referência em nível de HCL** dos stacks: como cada recurso é configurado e por quê.

## Índice

- [Estrutura e estados remotos](#estrutura-e-estados-remotos)
- [Providers e versionamento](#providers-e-versionamento)
- [Convenções: tags e nomenclatura](#convenções-tags-e-nomenclatura)
- [Recursos provisionados — `oficina-mecanica-infra-base`](#recursos-provisionados--oficina-mecanica-infra-base)
- [Recursos provisionados — `oficina-mecanica-k8s`](#recursos-provisionados--oficina-mecanica-k8s)
- [Variáveis e saídas](#variáveis-e-saídas)
- [Como aplicar localmente](#como-aplicar-localmente)

A infraestrutura foi separada em dois repositórios independentes para desacoplar a fundação de rede e a camada de cluster e workloads:

- [`oficina-mecanica-infra-base`](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-base): recursos-base de rede cloud (VPC, subnets públicas/privadas, IGW, NAT Gateway).
- [`oficina-mecanica-k8s`](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s): cluster EKS, Node Group, ECR, namespace `oficina`, banco PostgreSQL e metrics-server.

## Estrutura e estados remotos

Cada stack tem **state próprio** num backend S3 (bucket `bkt-oficina-mecanica`, região `us-east-1`), com chaves distintas:

| Repositório | Camada | Chave do state (S3) |
|---|---|---|
| [`oficina-mecanica-infra-base`](https://github.com/FIAP-15SOAT/oficina-mecanica-infra-base) | Rede Cloud | `infra/prod-simulated/infra-base/terraform.tfstate` |
| [`oficina-mecanica-k8s`](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s) | EKS & Workloads | `infra/prod-simulated/k8s/terraform.tfstate` |

Os dois backends usam `encrypt = true` (criptografia do state em repouso via SSE) e **`use_lockfile = true`** — o **lock nativo do S3** introduzido no Terraform ≥ 1.11, que dispensa uma tabela DynamoDB dedicada só para o lock.

O repositório `oficina-mecanica-k8s` **consome** `terraform_remote_state` de `oficina-mecanica-infra-base` para obter `vpc_id`, `vpc_cidr`, `private_subnet_ids` e `public_subnet_ids`.

## Providers e versionamento

Versões fixadas por faixa (`required_providers` + `required_version`), garantindo builds reprodutíveis:

| Provider / ferramenta | Restrição | Onde | Usado por |
|---|---|---|---|
| Terraform (core) | `>= 1.11.0` | `*/backend.tf` | ambos (o `use_lockfile` exige ≥ 1.11) |
| `hashicorp/aws` | `>= 6.46.0, < 7.0.0` | `*/providers.tf` | ambos |
| `hashicorp/kubernetes` | `>= 2.32.0, < 3.0.0` | `k8s/providers.tf` | `oficina-mecanica-k8s` |
| `hashicorp/helm` | `>= 3.0.0, < 4.0.0` | `k8s/providers.tf` | `oficina-mecanica-k8s` |

## Convenções: tags e nomenclatura

**Tags padrão.** O provider `aws` aplica `default_tags` a **todos** os recursos:

| Tag | Valor |
|---|---|
| `Project` | `var.project_name` (`oficina-mecanica`) |
| `ManagedBy` | `terraform` |
| `Environment` | `var.environment` (`prod-simulated`) |

**Nomenclatura.** Todos os nomes de recurso são padronizados a partir de `project_name` em `locals.tf`:

| Local | Padrão | Exemplo |
|---|---|---|
| `vpc_name` | `vpc-${project}` | `vpc-oficina-mecanica` |
| `eks_cluster_name` | `eks-${project}` | `eks-oficina-mecanica` |
| `eks_node_group_name` | `ng-eks-${project}-default` | `ng-eks-oficina-mecanica-default` |
| `ecr_app_repo_name` | `ecr-${project}-app-repo` | `ecr-oficina-mecanica-app-repo` |
| `secgrp_eks_cluster_name` | `secgrp-eks-cluster-${project}` | `secgrp-eks-cluster-oficina-mecanica` |
| `cw_lg_eks_cluster_tag_name` | `cw-lg-eks-cluster-${project}` | `cw-lg-eks-cluster-oficina-mecanica` |

## Recursos provisionados — `oficina-mecanica-infra-base`

### Rede (`networking.tf`)

- **VPC** `10.0.0.0/16`, com `enable_dns_support` e `enable_dns_hostnames`.
- **AZs**: `slice(data.aws_availability_zones…, 0, 2)` seleciona as **2 primeiras** zonas de `us-east-1`. As variáveis `public_subnet_cidrs`/`private_subnet_cidrs` têm um bloco `validation` que falha com menos de 2 CIDRs (exigência do EKS).
- **2 subnets públicas** (`10.0.0.0/24`, `10.0.1.0/24`): `map_public_ip_on_launch = true`; tags `kubernetes.io/cluster/<cluster> = shared` e `kubernetes.io/role/elb = 1`.
- **2 subnets privadas** (`10.0.10.0/24`, `10.0.11.0/24`): sem IP público; tags `kubernetes.io/cluster/<cluster> = shared` e `kubernetes.io/role/internal-elb = 1`.
- **Internet Gateway** e **um único** NAT Gateway + Elastic IP, alocado na `public[0]`.
- **Route tables**: `rt_public` → `0.0.0.0/0` via IGW; `rt_private` → `0.0.0.0/0` via NAT Gateway.

## Recursos provisionados — `oficina-mecanica-k8s`

### IAM: roles pré-existentes (lidas, não criadas)

O cluster e o node group usam roles IAM **pré-existentes** do laboratório AWS Academy (`LabEksClusterRole` e `LabEksNodeRole`), lidas via `data "aws_iam_role"`.

### EKS (`eks.tf`)

- **Cluster** versão `1.35` (`var.kubernetes_version`), associado às subnets privadas e públicas lidas via Remote State.
- **Logs do control plane**: `api`, `audit`, `authenticator`, `controllerManager`, `scheduler` — enviados a um **CloudWatch Log Group** com **retenção de 14 dias**.
- **Security Group** do control plane: ingress `443` **apenas da CIDR da VPC** (`data.terraform_remote_state.aws_base.outputs.vpc_cidr`); egress liberado.
- **Node group** gerenciado: instância `t3.small`, `desired = min = max = 1`, agendado **nas subnets privadas**.

### ECR (`ecr.tf`)

- Repositório de imagens da aplicação com `scan_on_push = true` e criptografia `AES256`.
- **Lifecycle policy**: mantém as **últimas 20 imagens** (`imageCountMoreThan 20` → `expire`).

### Namespace, PostgreSQL e metrics-server

- **Namespace** `oficina` (`k8s_namespace.tf`), com dependência explícita do Node Group (`depends_on = [aws_eks_node_group.eks_node_group]`).
- **PostgreSQL** (`k8s_postgres.tf`): `Secret postgres-secret` (`POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD`) + `Service` ClusterIP `5432` + `StatefulSet` (`postgres:16-alpine`, 1 réplica, `env_from` o Secret, requests `100m`/`256Mi`, limits `500m`/`512Mi`, volume **`emptyDir`**, probes `pg_isready`).
- **metrics-server** via Helm (`k8s_metrics_server.tf`): `helm_release` em `kube-system`, condicionado por `count = var.enable_metrics_server ? 1 : 0`. Alimenta o HPA da API.

## Variáveis e saídas

### `oficina-mecanica-infra-base` — variáveis

| Variável | Tipo | Default | Finalidade |
|---|---|---|---|
| `aws_region` | `string` | `us-east-1` | Região de todos os recursos |
| `project_name` | `string` | `oficina-mecanica` | Base para nomes e tags |
| `environment` | `string` | `prod-simulated` | Nome do ambiente (tag `Environment`) |
| `vpc_cidr` | `string` | `10.0.0.0/16` | CIDR da VPC |
| `public_subnet_cidrs` | `list(string)` | `["10.0.0.0/24","10.0.1.0/24"]` | Subnets públicas — `validation` exige ≥ 2 CIDRs |
| `private_subnet_cidrs` | `list(string)` | `["10.0.10.0/24","10.0.11.0/24"]` | Subnets privadas — `validation` exige ≥ 2 CIDRs |

### `oficina-mecanica-infra-base` — saídas

| Saída | Conteúdo |
|---|---|
| `vpc_id` | ID da VPC |
| `vpc_cidr` | Bloco CIDR da VPC |
| `public_subnet_ids` | IDs das subnets públicas |
| `private_subnet_ids` | IDs das subnets privadas |

### `oficina-mecanica-k8s` — variáveis

| Variável | Tipo | Default | Finalidade |
|---|---|---|---|
| `aws_region` | `string` | `us-east-1` | Região |
| `project_name` | `string` | `oficina-mecanica` | Base para tags |
| `environment` | `string` | `prod-simulated` | Nome do ambiente |
| `kubernetes_version` | `string` | `1.35` | Versão do EKS |
| `eks_cluster_role_name` | `string` | `LabEksClusterRole` | Role IAM pré-existente do cluster (lida via `data`) |
| `eks_node_role_name` | `string` | `LabEksNodeRole` | Role IAM pré-existente do node group (lida via `data`) |
| `node_instance_type` | `string` | `t3.small` | Tipo de instância do node group |
| `node_desired_size` | `number` | `1` | Nodes desejados |
| `node_min_size` | `number` | `1` | Nodes mínimos |
| `node_max_size` | `number` | `1` | Nodes máximos |
| `aws_base_state_bucket` | `string` | `bkt-oficina-mecanica` | Bucket do remote state de rede (`infra-base`) |
| `aws_base_state_key` | `string` | `infra/prod-simulated/infra-base/terraform.tfstate` | Chave do remote state de rede (`infra-base`) |
| `aws_base_state_region` | `string` | `us-east-1` | Região do bucket de state |
| `k8s_namespace` | `string` | `oficina` | Namespace compartilhado |
| `k8s_postgres_user` | `string` | `postgres` | Usuário do Postgres (Secret) |
| `k8s_postgres_db` | `string` | `techchallenge` | Nome do banco (Secret) |
| `k8s_postgres_password` | `string` | — (**`sensitive`**, sem default) | Senha do Postgres — injetada via `TF_VAR_k8s_postgres_password` no CI |
| `k8s_postgres_image` | `string` | `postgres:16-alpine` | Imagem do container do banco |
| `enable_metrics_server` | `bool` | `true` | Instala o metrics-server (habilita o HPA) |
| `metrics_server_chart_version` | `string` | `""` | Versão do chart (vazio = última) |

### `oficina-mecanica-k8s` — saídas

| Saída | Conteúdo |
|---|---|
| `cluster_name` | Nome do cluster EKS |
| `cluster_endpoint` | Endpoint do API server |
| `cluster_certificate_authority_data` | CA do cluster em base64 |
| `cluster_version` | Versão do Kubernetes em uso |
| `ecr_repository_url` | URL do repositório ECR da aplicação |
| `k8s_namespace` | Namespace da solução (`oficina`) |
| `postgres_service_dns` | DNS interno do banco: `postgres.oficina.svc.cluster.local` |
| `postgres_service_port` | Porta do Service do Postgres (`5432`) |
| `zz_next_steps` | Guia pós-`apply`: instruções para exportar credenciais AWS, rodar `aws eks update-kubeconfig` e validar com `kubectl get nodes` |

## Como aplicar localmente

Pré-requisitos:

- Terraform >= 1.11
- Credenciais AWS válidas no ambiente
- Bucket de state remoto já acessível

Ordem de execução (obrigatória):

```bash
# 1) Provisiona a fundação de rede AWS
git clone https://github.com/FIAP-15SOAT/oficina-mecanica-infra-base.git
cd oficina-mecanica-infra-base/terraform
terraform init
terraform plan
terraform apply

# 2) Provisiona o cluster EKS, ECR e recursos base do Kubernetes
git clone https://github.com/FIAP-15SOAT/oficina-mecanica-k8s.git
cd oficina-mecanica-k8s/terraform
terraform init
terraform plan -var="k8s_postgres_password=<SENHA_FORTE>"
terraform apply -var="k8s_postgres_password=<SENHA_FORTE>"
```

No CI, o secret do PostgreSQL é injetado via `TF_VAR_k8s_postgres_password`.
