# 🌍 Terraform (IaC)

Dois stacks Terraform independentes: `aws-base` (rede + EKS + ECR) e `k8s-base` (workloads Kubernetes compartilhados).

## Índice

- [Estrutura e estados remotos](#estrutura-e-estados-remotos)
- [Recursos provisionados](#recursos-provisionados)
- [Entradas e saídas por stack](#entradas-e-saídas-por-stack)
- [Como aplicar localmente](#como-aplicar-localmente)

A infraestrutura foi separada em dois stacks Terraform independentes para reduzir acoplamento e tornar o fluxo de provisionamento previsível:

- `infra/aws-base`: recursos-base de cloud (rede + EKS + ECR)
- `infra/k8s-base`: recursos Kubernetes compartilhados (namespace, banco PostgreSQL e metrics-server)

Essa separação foi adotada para evitar bootstrap complexo do provider Kubernetes no mesmo stack de criação do EKS e para permitir evolução independente entre camada cloud e camada de workloads.

## Estrutura e estados remotos

- Stack cloud: `infra/aws-base`
  - backend S3: `infra/prod-simulated/aws-base/terraform.tfstate`
- Stack workloads: `infra/k8s-base`
  - backend S3: `infra/prod-simulated/k8s-base/terraform.tfstate`
  - consome `terraform_remote_state` do stack `aws-base` para obter endpoint, CA e nome do cluster

## Recursos provisionados

`infra/aws-base`:

- VPC, subnets públicas/privadas, Internet Gateway e NAT Gateway
- EKS cluster
- Repositório ECR para imagens da aplicação

`infra/k8s-base`:

- Namespace compartilhado da solução (`oficina`)
- Banco PostgreSQL no cluster via Secret + Service + StatefulSet (armazenamento efêmero `emptyDir`)
- metrics-server via Helm (necessário para HPA por CPU/memória)

## Entradas e saídas por stack

`infra/aws-base`:

- Entradas principais:
  - `aws_region`, `project_name`, `environment`
  - `kubernetes_version`
  - `eks_cluster_role_name`, `eks_node_role_name`
  - `vpc_cidr`, `public_subnet_cidrs`, `private_subnet_cidrs`
  - `node_instance_type`, `node_desired_size`, `node_min_size`, `node_max_size`
- Saídas principais:
  - `cluster_name`
  - `cluster_endpoint`
  - `cluster_certificate_authority_data`
  - `cluster_version`
  - `vpc_id`, `private_subnet_ids`, `public_subnet_ids`

`infra/k8s-base`:

- Entradas principais:
  - `aws_region`, `project_name`, `environment`
  - `aws_base_state_bucket`, `aws_base_state_key`, `aws_base_state_region` (para leitura de remote state)
  - `k8s_namespace`
  - `k8s_postgres_db`, `k8s_postgres_user`, `k8s_postgres_password`, `k8s_postgres_image`
  - `enable_metrics_server`, `metrics_server_chart_version`
- Dependências de saída consumidas do `aws-base` (via `terraform_remote_state`):
  - `cluster_name` (auth no EKS)
  - `cluster_endpoint`
  - `cluster_certificate_authority_data`
- Saídas principais:
  - `k8s_namespace`
  - `postgres_service_dns`
  - `postgres_service_port`

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
