# ADR 0014: Pipelines de CI, CD, SAST e DAST separados

## Status

Aceito — 2026-09-07

## Contexto

O enunciado da Fase 2 exige uma "Pipeline de CI/CD: build, testes, imagem Docker, deploy no cluster e aplicação dos manifestos". Além do pipeline funcional, o projeto adotou análise estática (SonarQube/SAST) e dinâmica (OWASP ZAP/DAST) de segurança e qualidade. Cada uma dessas quatro responsabilidades tem gatilho, duração e criticidade de bloqueio diferentes: validar uma mudança antes do merge não é a mesma operação que entregá-la em produção, e um scan de segurança que sobe uma stack inteira e demora minutos não deveria ter a mesma cadência nem o mesmo poder de bloqueio que testes unitários que rodam em segundos.

## Decisão

Dividir a automação em **quatro workflows do GitHub Actions**, um por responsabilidade:

| Workflow | Gatilho | Responsabilidade |
|---|---|---|
| **CI** | `push` em `feature/**`/`fix/**` | Validar a mudança (lint, testes unitários e E2E, build, `terraform plan`, validação de banco) e abrir o PR |
| **CD** | `push` em `master` (pós-merge) + `workflow_dispatch` | Entrega ponta a ponta: `terraform apply`, build da imagem, migração do banco, deploy no cluster |
| **SAST** | `pull_request` + `push` em `master` | SonarCloud, em paralelo ao CD — não bloqueia o deploy |
| **DAST** | `pull_request` → `master` + `workflow_dispatch` | OWASP ZAP contra a API em execução, em paralelo ao CI/CD |

O CI roda o `terraform plan` (o revisor vê o diff de infraestrutura no PR); o CD roda o `terraform apply` — o merge na `master` protegida (só via PR com checks verdes) é a aprovação que autoriza a mudança de infraestrutura, seguindo a prática recomendada pela HashiCorp de nunca aplicar sem revisão do plano.

## Alternativas consideradas

### Um único workflow monolítico para tudo

Um só arquivo YAML rodando lint, testes, build, scans de segurança e deploy em sequência, sob um único gatilho. Descartado porque:

- Misturaria gatilhos incompatíveis: CI deveria rodar a cada push numa branch de trabalho; CD só deveria rodar após merge na `master`; DAST precisa de uma stack completa em execução, o que é caro para rodar a cada commit de uma feature branch ainda em desenvolvimento.
- Um scan de DAST ou SAST lento bloquearia (ou pelo menos atrasaria) o feedback rápido de lint/testes unitários que o desenvolvedor espera em segundos, não minutos.
- Falha de um scan de segurança (não bloqueante por design) impediria visualizar separadamente se o problema foi de qualidade de código, de teste, ou de vulnerabilidade — um único job com tudo dificulta isolar a causa.

### SAST e DAST como gates bloqueantes do merge/deploy

Faria qualquer achado de SonarQube ou ZAP impedir o merge ou o deploy até ser resolvido. Descartado (mantendo-os em paralelo, não bloqueantes) porque:

- SAST está sujeito a limitação do plano do SonarCloud usado no projeto, que não é suficiente para tratá-lo como gate obrigatório de PR sem risco de falso bloqueio por indisponibilidade ou limite de análises.
- DAST sobe uma stack completa e roda um scan ativo — é lento o suficiente para não ser um gate confortável de bloquear todo PR; rodar em paralelo permite que o time veja o resultado sem atrasar a entrega de mudanças que não tocam a superfície de segurança testada.
- Ambos continuam **visíveis** (relatórios publicados) mesmo não bloqueando — a decisão foi sobre criticidade de bloqueio, não sobre deixar de rodar ou de reportar.

### CD acoplado ao CI via `workflow_run`

O CD seria disparado pelo evento de conclusão do CI, em vez de por push direto na `master`. Descartado em favor de gatilho direto por `push`/`workflow_dispatch`, com a ordem interna de jobs do CD garantida por `needs:` — evita a complexidade adicional (e a depuração mais difícil) de acoplar dois workflows por evento de conclusão, quando o próprio fluxo de branch protegida (`master` só recebe merge via PR com CI verde) já garante que todo push em `master` passou pelo CI antes.

## Consequências

### Positivas

- **Feedback rápido não é bloqueado por scans lentos**: lint e testes unitários (CI) respondem em segundos; SAST e DAST rodam em paralelo, sem atrasar o ciclo de desenvolvimento.
- **Cada workflow tem gatilho e escopo únicos, mais fáceis de raciocinar isoladamente**: um problema de deploy é depurado no CD; um achado de segurança, no SAST/DAST — sem misturar logs de responsabilidades diferentes num único job gigante.
- **`terraform plan` no CI e `apply` no CD** dá visibilidade da mudança de infraestrutura no PR antes de ela ser aplicada, sem exigir uma ferramenta de gestão de state adicional além do próprio fluxo de PR.

### Negativas / Trade-offs

- **Achados de segurança não bloqueiam automaticamente**: um problema real reportado por SAST ou DAST pode ser mesclado/deployado antes de ser corrigido, se ninguém agir sobre o relatório — a mitigação é processo (revisão do relatório), não uma trava automática.
- **Quatro arquivos de workflow para manter em vez de um**: mudanças que afetam mais de uma responsabilidade (ex.: uma nova env var usada tanto no CI quanto no CD) precisam ser replicadas em mais de um lugar.
- **Sem coordenação nativa entre os quatro**: um DAST rodando contra uma versão do código diferente da que o CD acabou de implantar é possível (gatilhos independentes) — mitigado por DAST rodar contra o PR (candidato ao merge), não contra produção.

### Riscos mitigados

- **Regressão de infraestrutura aplicada sem revisão**: mitigado por `terraform plan` rodar no CI (visível no PR) e `apply` só no CD, após merge revisado.
- **Ciclo de desenvolvimento lento por scans de segurança**: mitigado por rodá-los em paralelo, não em série, ao CI/CD.

## Referências

- [`docs/infra/ci-cd.md`](../infra/ci-cd.md) — os quatro workflows, gatilhos, jobs e secrets.
