# ☸️ Kubernetes

Divisão de responsabilidade: base e plataforma via Terraform no repositório [`oficina-mecanica-k8s`](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s); aplicação via manifests em `k8s/`.

> 🧭 Para a **visão de sistema** (inventário, topologia, fluxo em tempo de execução, segurança e limitações), comece pela [Visão Geral da Infraestrutura](overview.md). **Este documento é a referência em nível de manifesto**: como cada workload é configurado e por quê. A definição HCL do PostgreSQL e do metrics-server está em [terraform.md](terraform.md).

## Índice

- [Motivo da divisão](#motivo-da-divisão)
- [Ownership de recursos](#ownership-de-recursos)
- [Convenções: labels e wiring de configuração](#convenções-labels-e-wiring-de-configuração)
- [Recursos: CPU e memória (requests e limits)](#recursos-cpu-e-memória-requests-e-limits)
- [Armazenamento do PostgreSQL: emptyDir vs EBS CSI](#armazenamento-do-postgresql-ausência-do-ebs-csi-driver-e-uso-de-emptydir)
- [PostgreSQL no cluster (StatefulSet)](#postgresql-no-cluster-statefulset)
- [Manifestos da aplicação](#manifestos-da-aplicação)
- [Job de migração do banco](#job-de-migração-do-banco)
- [Autoscaling da API (HPA)](#autoscaling-da-api-hpa)
- [Acesso à aplicação](#acesso-à-aplicação-em-kubernetes)
- [Health probes](#health-probes-readinessprobe-e-livenessprobe)
- [Deploy manual](#deploy-em-kubernetes-manual)

Os recursos em Kubernetes foram divididos por responsabilidade:

- Base e dados críticos via Terraform ([`oficina-mecanica-k8s`](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s))
  - cluster EKS, ECR, namespace `oficina`, PostgreSQL e metrics-server
- Aplicação via manifests YAML (`k8s/`)
  - Secret, ConfigMap, Deployments, Services e HPA

## Motivo da divisão

- Recursos de plataforma e dados (cluster, namespace, DB, observabilidade mínima) têm ciclo de vida mais estável e exigem rastreabilidade de estado: por isso ficam no Terraform.
- Recursos da aplicação mudam com maior frequência (imagem, envs, escala): por isso ficam em manifests declarativos no diretório `k8s/` e são aplicados no deploy.

## Ownership de recursos

| Recurso | Ownership | Onde é definido/aplicado |
|---|---|---|
| Namespace `oficina` | Terraform | [`oficina-mecanica-k8s`](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s) (`terraform/k8s_namespace.tf`) |
| PostgreSQL (Secret, Service, StatefulSet com `emptyDir`) | Terraform | [`oficina-mecanica-k8s`](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s) (`terraform/k8s_postgres.tf`) |
| metrics-server | Terraform | [`oficina-mecanica-k8s`](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s) (`terraform/k8s_metrics_server.tf`) |
| DB migration Job (`00-db-migrate-job.yaml`) | Workflow de CD | Render + `kubectl apply` (job `db-migrate`) em `.github/workflows/cd.yml` |
| API Secret (`01-api-secret.yaml`) | Workflow de CD | Render + `kubectl apply` em `.github/workflows/cd.yml` |
| API ConfigMap (`02-api-configmap.yaml`) | Workflow de CD | `kubectl apply` em `.github/workflows/cd.yml` |
| API Deployment (`03-api-deployment.yaml`) | Workflow de CD | Render + `kubectl apply` em `.github/workflows/cd.yml` |
| MailHog Deployment (`03-mailhog-deployment.yaml`) | Workflow de CD | `kubectl apply` em `.github/workflows/cd.yml` (dependência de e-mail) |
| API Service (`04-api-service.yaml`) | Workflow de CD | `kubectl apply` em `.github/workflows/cd.yml` |
| MailHog Service (`04-mailhog-service.yaml`) | Workflow de CD | `kubectl apply` em `.github/workflows/cd.yml` (SMTP `1025` / Web UI `8025`) |
| API HPA (`05-api-hpa.yaml`) | Workflow de CD | `kubectl apply` em `.github/workflows/cd.yml` |

## Convenções: labels e wiring de configuração

**Labels.** Todos os recursos carregam as labels recomendadas do Kubernetes, o que permite selecioná-los e agrupá-los de forma consistente:

- `app.kubernetes.io/name` — identifica o componente (`oficina-api`, `postgres`, `mailhog`, `db-migrate-job`).
- `app.kubernetes.io/part-of` — sempre `oficina-mecanica` (a solução como um todo).
- `managed-by: terraform` — presente apenas nos recursos provisionados pelo Terraform (`oficina-mecanica-k8s`), distinguindo-os dos manifests aplicados pelo CD.

**Wiring de configuração.** A configuração da API é injetada como variáveis de ambiente a partir de duas fontes, separando o sensível do não-sensível:

- `configMapKeyRef` → `api-config` (`ConfigMap`, **não sensível**): `NODE_ENV`, `PORT`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION`, `BCRYPT_SALT_ROUNDS`, `MAIL_HOST`, `MAIL_PORT`, `TZ`.
- `secretKeyRef` → `api-secret` (`Secret`, **sensível**): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `QUOTE_DECISION_TOKEN_SECRET`.

O Deployment referencia cada chave individualmente (`valueFrom`), o que torna explícito no manifesto de onde vem cada env — em vez de um `envFrom` opaco.

## Recursos: CPU e memória (requests e limits)

Cada workload declara `requests` (o que o scheduler reserva) e `limits` (o teto antes de throttling/OOM-kill):

| Workload | Requests (CPU / memória) | Limits (CPU / memória) | Fonte |
|---|---|---|---|
| API (`oficina-api`) | `200m` / `256Mi` | `500m` / `512Mi` | `k8s/03-api-deployment.yaml` |
| PostgreSQL | `100m` / `256Mi` | `500m` / `512Mi` | [`oficina-mecanica-k8s`](https://github.com/FIAP-15SOAT/oficina-mecanica-k8s) |
| MailHog | `50m` / `64Mi` | `200m` / `256Mi` | `k8s/03-mailhog-deployment.yaml` |
| Job `db-migrate` | — (não define) | — (não define) | `k8s/00-db-migrate-job.yaml` |

## Armazenamento do PostgreSQL: ausência do EBS CSI Driver e uso de `emptyDir`

### O que foi tentado

Foram exploradas duas abordagens com disco EBS antes de chegar ao `emptyDir`.

**Tentativa 1 — StorageClass `gp2` (padrão do EKS)**

A primeira abordagem utilizou a StorageClass `gp2` criada automaticamente pelo EKS, que usa o provisioner in-tree `kubernetes.io/aws-ebs`. O fluxo esperado era:

1. Terraform cria um `PersistentVolumeClaim` com `storageClassName: gp2`
2. O Kubernetes chama o provisioner para criar um volume EBS `gp2`
3. O StatefulSet do PostgreSQL monta esse volume em `/var/lib/postgresql/data`

Em clusters EKS 1.23+, porém, o recurso de **CSI Migration** está habilitado por padrão: chamadas ao provisioner in-tree `kubernetes.io/aws-ebs` são redirecionadas internamente para o EBS CSI Driver (`ebs.csi.aws.com`). Com o driver em crash (ver seção abaixo), o redirecionamento nunca se completa e o PVC fica `Pending`.

**Tentativa 2 — StorageClass customizada `gp3`**

A segunda abordagem criou explicitamente uma StorageClass com o provisioner `ebs.csi.aws.com` e o tipo de volume `gp3` (mais performático e mais barato que `gp2`):

```hcl
resource "kubernetes_storage_class_v1" "gp3" {
  metadata { name = "gp3" }
  storage_provisioner    = "ebs.csi.aws.com"
  volume_binding_mode    = "WaitForFirstConsumer"
  reclaim_policy         = "Delete"
  allow_volume_expansion = true
  parameters = {
    type      = "gp3"
    encrypted = "true"
  }
}
```

Por chamar o CSI driver diretamente (sem o nível de indireção da CSI Migration), o problema ficou ainda mais explícito: o PVC nunca avançou de `Pending` porque não há nenhum controller funcional para atender a requisição de provisionamento.

### Por que não funcionou — diagnóstico técnico

**O EBS CSI Driver está instalado, mas sem credenciais IAM.**

O addon `aws-ebs-csi-driver` (v1.60.0) foi implantado no cluster, porém os pods `ebs-csi-controller` entram em `CrashLoopBackOff` imediatamente após o start. O log expõe a causa raiz com precisão:

```
Failed health check: dry-run EC2 API call failed:
no EC2 IMDS role found — operation error ec2imds: GetMetadata, context deadline exceeded
```

O controller tenta obter credenciais AWS de dois lugares, em ordem:

1. **IRSA** (IAM Roles for Service Accounts): uma IAM Role anotada no ServiceAccount `ebs-csi-controller-sa` via `eks.amazonaws.com/role-arn`. O ServiceAccount não possui essa anotação — `serviceAccountRoleArn: NOT SET`.
2. **Instance Profile do node**: a role IAM do node group (`LabEksNodeRole`) não possui a policy `AmazonEBSCSIDriverPolicy`. Nenhuma das políticas atualmente anexadas (`AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy`, `AmazonEC2ContainerRegistryReadOnly`) concede permissão para operações de EBS (`ec2:CreateVolume`, `ec2:AttachVolume`, etc.).

Sem credenciais válidas em nenhum dos dois caminhos, o controller falha no health check interno e reinicia indefinidamente.

**Não foi possível corrigir via Terraform ou CLI** porque o ambiente de laboratório da FIAP (AWS Academy / Learner Lab) bloqueia as permissões IAM necessárias:

| Ação tentada | Resultado |
|---|---|
| `iam:AttachRolePolicy` no node role | `AccessDenied` |
| Definir `serviceAccountRoleArn` no addon via Terraform | Requer `iam:CreateRole` + `iam:CreateOpenIDConnectProvider` para configurar IRSA — também negados |

**Impacto em cadeia no PVC**: ambas as StorageClasses testadas (`gp2` e a `gp3` customizada) usam `volumeBindingMode: WaitForFirstConsumer`, o que significa que o PVC só é vinculado a um volume EBS quando um pod consumidor é agendado. Com o CSI controller em crash, porém, essa distinção se torna irrelevante: nenhum controller está disponível para receber a requisição de provisionamento. O PVC fica em estado `Pending` indefinidamente. O `terraform apply` aguarda o StatefulSet atingir `Ready` e expira com `context deadline exceeded` após o timeout padrão do provider.

### Por que `emptyDir` foi escolhido

`emptyDir` é um volume efêmero criado pelo próprio Kubernetes no node onde o pod roda. Não requer StorageClass, PVC, CSI driver, nem nenhuma permissão IAM. O pod sobe imediatamente.

A troca — perda de dados ao reiniciar o pod — é aceitável neste contexto específico porque:

1. **O deploy é não-destrutivo, mas o `emptyDir` é efêmero**: o CD roda `prisma migrate deploy` (aplica apenas migrations pendentes, sem apagar dados), então os dados persistem entre deploys. Se o pod do PostgreSQL for reagendado, porém, o `emptyDir` é perdido — nesse caso o schema é recriado no próximo deploy e os dados de referência são repopulados automaticamente pelo job de migração (que roda `migrate deploy` + `db seed` idempotente).
2. **Ambiente acadêmico**: não há dados de usuário reais nem requisito de durabilidade entre reinicializações. O objetivo do projeto é demonstrar a arquitetura e o pipeline, não operar um banco de dados de produção.
3. **Sem alternativa viável no ambiente**: `hostPath` daria falsa sensação de persistência — nodes EKS gerenciados são substituídos pela AWS em atualizações de AMI ou eventos de scale, perdendo os dados da mesma forma, mas com risco de segurança adicional (acesso ao filesystem do host).

### O que seria necessário em produção

Para um ambiente real, a solução correta seria uma das seguintes, em ordem de preferência:

1. **IRSA para o EBS CSI Driver**: criar uma IAM Role com trust policy para o OIDC provider do cluster e a policy gerenciada `AmazonEBSCSIDriverPolicy`, anotando o ServiceAccount `ebs-csi-controller-sa`. Isso isola as credenciais do driver sem conceder permissões ao node inteiro.
2. **`AmazonEBSCSIDriverPolicy` no node role**: solução mais simples, porém concede permissões de EBS a todos os processos rodando nos nodes — menos seguro que IRSA.
3. **Amazon RDS (PostgreSQL gerenciado)**: elimina completamente o problema de armazenamento no Kubernetes e é o padrão recomendado para workloads de produção na AWS. Não foi aplicado neste projeto devido ao budget limitado do laboratório (créditos AWS Academy de US$ 50), insuficiente para cobrir o custo de uma instância RDS durante o período de desenvolvimento e avaliação.

## Banco de Dados Relacional (Amazon RDS)

A persistência relacional da aplicação é fornecida pelo **Amazon RDS (PostgreSQL)**, gerenciado no repositório dedicado [`oficina-mecanica-database`](https://github.com/FIAP-15SOAT/oficina-mecanica-database):

- Instância gerenciada PostgreSQL 16 (Single-AZ, `db.t4g.micro`, 20 GiB GP3).
- Alocado nas subnets privadas da VPC, com Security Group restrito ao CIDR da VPC.
- Acesso pela aplicação via `DATABASE_URL` injetada dinamicamente no `api-secret`.

## Manifestos da aplicação

Arquivos em `k8s/`:

- `00-db-migrate-job.yaml`: Job **one-shot** de migração/seed do banco (`prisma migrate deploy` + `db seed`), com placeholders de nome (`JOB_NAME_PLACEHOLDER`) e imagem (`IMAGE_URI_PLACEHOLDER`); renderizado e aplicado pelo job `db-migrate` do CD antes do rollout — não é um recurso de estado da aplicação, por isso o prefixo `00-`. Detalhes em [Job de migração do banco](#job-de-migração-do-banco)
- `01-api-secret.yaml`: secrets da aplicação (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` e `QUOTE_DECISION_TOKEN_SECRET`), renderizados no pipeline com valores provenientes dos GitHub Secrets e Variables
- `02-api-configmap.yaml`: variáveis não sensíveis da aplicação (`NODE_ENV`, `PORT`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION`, `BCRYPT_SALT_ROUNDS`, `MAIL_HOST`, `MAIL_PORT` e `TZ`)
- `03-api-deployment.yaml`: deployment da API com placeholder de imagem (`IMAGE_URI_PLACEHOLDER`), `imagePullPolicy: Always`, consumo de Secret/ConfigMap (ver [wiring de configuração](#convenções-labels-e-wiring-de-configuração)) e probes de saúde
- `03-mailhog-deployment.yaml`: deployment do MailHog para captura de e-mails enviados pela aplicação
- `04-api-service.yaml`: Service `ClusterIP` da API
- `04-mailhog-service.yaml`: Service `ClusterIP` do MailHog, expondo as portas SMTP (`1025`) e Web UI (`8025`) para acesso interno ao cluster
- `05-api-hpa.yaml`: autoscaling da API por CPU e memória (HPA v2) — ver [Autoscaling da API (HPA)](#autoscaling-da-api-hpa)

## Job de migração do banco

O `00-db-migrate-job.yaml` é um `Job` do Kubernetes executado **uma vez por deploy**, antes do rollout da API, para deixar o schema em dia. Características relevantes:

- **`backoffLimit: 0` + `restartPolicy: Never`** — falha rápido, sem retentativas silenciosas: se a migração falhar, o Job falha imediatamente e o pipeline para (em vez de mascarar o erro com reinícios).
- **`ttlSecondsAfterFinished: 1209600`** — o Job é coletado automaticamente **14 dias** após terminar, evitando acúmulo de Jobs concluídos no namespace (cada run cria um Job com nome renderizado, via `JOB_NAME_PLACEHOLDER`).
- **Consumo da `DATABASE_URL`** — o container recebe `DATABASE_URL` via `secretKeyRef` do `api-secret` e executa:

  ```sh
  npx prisma migrate deploy
  npx prisma db seed
  ```

- **`prisma migrate deploy`** aplica apenas migrations pendentes (não-destrutivo) e **`prisma db seed`** é idempotente.

## Autoscaling da API (HPA)

O `05-api-hpa.yaml` (HPA `autoscaling/v2`) escala o Deployment `oficina-api` com base em **duas métricas de recurso**:

| Campo | Valor |
|---|---|
| `scaleTargetRef` | `Deployment/oficina-api` |
| `minReplicas` / `maxReplicas` | `1` / `5` |
| CPU (`Resource`, `averageUtilization`) | `70` |
| Memória (`Resource`, `averageUtilization`) | `80` |

`averageUtilization` é medido como **percentual da `request`** do pod — por exemplo, 70% de CPU significa 70% dos `200m` requisitados pela API (≈ `140m` de média entre as réplicas) como gatilho para escalar. O HPA escala quando **qualquer** das duas métricas ultrapassa seu alvo. As métricas vêm do **metrics-server** (provisionado em `oficina-mecanica-k8s`); sem ele, o HPA não teria dados para decidir.

O HPA escala apenas os **pods da API** (`1→5`); a escala do _cluster_ (nodes) está fora do escopo — o node group é mantido fixo em 1 por decisão, como registrado em [overview.md › Limitações](overview.md#limitações-e-o-que-produção-exigiria).

## Acesso à aplicação em Kubernetes

O Service da API é publicado como `ClusterIP`, portanto não é acessível diretamente fora do cluster. Para testes e validações manuais, utilize `kubectl port-forward` para criar um túnel entre a sua máquina e o Service da aplicação.

```bash
kubectl port-forward -n oficina svc/oficina-api 3000:3000
```

Após estabelecer o túnel, a aplicação poderá ser acessada localmente através dos seguintes endereços:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`

Para interromper o túnel, pressione `Ctrl+C` no terminal onde o comando estiver em execução.

Caso seja necessário validar se o Service possui endpoints disponíveis:

```bash
kubectl get endpoints oficina-api -n oficina
```

Para acessar a interface web do MailHog executando no cluster:

```bash
kubectl port-forward -n oficina svc/mailhog 8025:8025
```

A interface ficará disponível em:

- MailHog: `http://localhost:8025`

## Health probes (readinessProbe e livenessProbe)

Cada workload usa o **mecanismo de probe mais adequado ao que expõe**:

| Workload | Mecanismo | Alvo |
|---|---|---|
| API (`oficina-api`) | HTTP `GET` | `/api/docs` (porta 3000) |
| MailHog | TCP socket | porta `1025` (SMTP) |
| PostgreSQL | `exec` | `pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"` |

O MailHog não tem um endpoint HTTP de health dedicado, então um **TCP check** na porta SMTP (`1025`) é suficiente para saber que o processo está de pé; o PostgreSQL usa **`pg_isready`** por ser uma checagem semântica de "o banco aceita conexões" (ver [PostgreSQL no cluster](#postgresql-no-cluster-statefulset)). A API expõe HTTP, então usa uma probe HTTP.

O Deployment da API configura duas probes HTTP GET em `/api/docs` (porta 3000):

| Probe | Finalidade | `initialDelaySeconds` | `periodSeconds` | `failureThreshold` |
|---|---|---|---|---|
| `readinessProbe` | Indica ao Kubernetes quando o pod está pronto para receber tráfego. Enquanto falhar, o pod é retirado do balanceamento sem ser reiniciado. | 10 | 10 | 3 |
| `livenessProbe` | Detecta pods travados que continuam vivos mas não respondem. Ao falhar, o Kubernetes reinicia o container automaticamente. | 30 | 20 | 3 |

O endpoint `/api/docs` (Swagger UI) foi escolhido por ser a única rota pública que retorna HTTP 200 sem autenticação, confirmando que o servidor HTTP está operacional.

O `initialDelaySeconds` da liveness é propositalmente maior (30 s) do que o da readiness (10 s): a readiness remove o pod do tráfego logo cedo se a aplicação ainda não subiu, enquanto a liveness aguarda mais para não reiniciar um pod que está apenas demorando para inicializar.

## Deploy em Kubernetes (manual)

```bash
# Renderiza segredo

export CHANGE_ME_STRONG_PASSWORD=<SENHA_DB>
export JWT_SECRET=<JWT_SECRET>
export JWT_REFRESH_SECRET=<JWT_REFRESH_SECRET>
export QUOTE_DECISION_TOKEN_SECRET=<QUOTE_DECISION_TOKEN_SECRET>

envsubst \
'${CHANGE_ME_STRONG_PASSWORD} ${JWT_SECRET} ${JWT_REFRESH_SECRET} ${QUOTE_DECISION_TOKEN_SECRET}' \
< k8s/01-api-secret.yaml \
> k8s/01-api-secret.rendered.yaml

# Renderiza imagem

sed "s|IMAGE_URI_PLACEHOLDER|<IMAGE_URI>|g" k8s/03-api-deployment.yaml > k8s/03-api-deployment.rendered.yaml

# Aplica recursos da aplicação

kubectl apply -f k8s/01-api-secret.rendered.yaml
kubectl apply -f k8s/02-api-configmap.yaml
kubectl apply -f k8s/03-api-deployment.rendered.yaml
kubectl apply -f k8s/04-api-service.yaml
kubectl apply -f k8s/05-api-hpa.yaml
```
